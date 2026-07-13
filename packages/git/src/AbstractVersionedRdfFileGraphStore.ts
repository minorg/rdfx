import fs from "node:fs";
import { join, relative } from "node:path";
import type { Readable, Writable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import {
  type Dirent,
  type ErrnoException,
  type FileSystem,
  NodeFileSystem,
  type RdfDirectoryGraphStore,
  type RdfFileGraphStore,
  type Stat,
} from "@rdfx/fs";
import type { GraphIdentifier, VersionedGraphStore } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, type Maybe } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";

export abstract class AbstractVersionedRdfFileGraphStore
  implements VersionedGraphStore<string>
{
  protected readonly gitParameters: GitParameters;
  protected readonly logger: Logger;

  constructor(
    readonly path: string,
    {
      gitParameters,
      logger,
    }: {
      gitParameters: Omit<GitParameters, "fs">;
      logger?: Logger;
    },
  ) {
    this.gitParameters = {
      ...gitParameters,
      fs,
    };
    this.logger = logger ?? dummyLogger;
  }

  async clear(): Promise<Either<Error, { readonly version: string }>> {
    return this.mutate((delegate) => delegate.clear());
  }

  async delete(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, { readonly version: string }>> {
    return this.mutate((delegate) => delegate.delete(identifier));
  }

  get(
    identifier: GraphIdentifier,
    options?: { readonly version?: string },
  ): Promise<Either<Error, Maybe<Stream>>> {
    const version = options?.version;
    if (!version) {
      return this.delegate().get(identifier);
    }

    return this.getVersion(identifier, version);
  }

  protected abstract getVersion(
    identifier: GraphIdentifier,
    version: string,
  ): Promise<Either<Error, Maybe<Stream>>>;

  async head(
    identifier: GraphIdentifier,
    options?: { readonly version?: string },
  ): Promise<Either<Error, boolean>> {
    const version = options?.version;
    if (!version) {
      return this.delegate().head(identifier);
    }

    return EitherAsync(async ({ liftEither }) => {
      const stream = (
        await liftEither(await this.getVersion(identifier, version))
      ).extract();
      if (!stream) {
        return false;
      }
      return await (stream as Readable).some((quad: Quad) =>
        quad.graph.equals(identifier),
      );
    });
  }

  identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return this.delegate().identifiers();
  }

  isEmpty(): Promise<Either<Error, boolean>> {
    return this.delegate().isEmpty();
  }

  async post(
    quads: Stream,
  ): Promise<Either<Error, { readonly version: string }>> {
    return this.mutate((delegate) => delegate.post(quads));
  }

  async put(
    quads: Stream,
  ): Promise<Either<Error, { readonly version: string }>> {
    return this.mutate((delegate) => delegate.put(quads));
  }

  protected abstract delegate(options?: {
    fileSystem?: FileSystem;
  }): RdfDirectoryGraphStore | RdfFileGraphStore;

  private async mutate(
    mutator: (
      delegate: RdfDirectoryGraphStore | RdfFileGraphStore,
    ) => Promise<Either<Error, object>>,
  ): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async ({ liftEither }) => {
      const addedFilePaths: string[] = [];
      const gitRelativeFilePath = (filePath: string) =>
        this.gitRelativeFilePath(filePath);
      const gitParameters = this.gitParameters;
      const removedFilePaths: string[] = [];

      const underlyingFileSystem = NodeFileSystem.instance;
      const fileSystem: FileSystem = {
        createDirectory(
          path: string,
          options?: FileSystem.CreateDirectoryOptions,
        ): Promise<Either<ErrnoException, void>> {
          return underlyingFileSystem.createDirectory(path, options);
        },

        createReadStream(path: string): Readable {
          return underlyingFileSystem.createReadStream(path);
        },

        async deleteDirectory(
          path: string,
          options?: FileSystem.DeleteDirectoryOptions,
        ): Promise<Either<ErrnoException, void>> {
          return EitherAsync(async ({ liftEither }) => {
            const filePaths = (
              await liftEither(
                await underlyingFileSystem.readDirectory(path, options),
              )
            )
              .filter((dirent) => dirent.isFile())
              .map((dirent) => join(dirent.parentPath, dirent.name));
            await liftEither(
              await underlyingFileSystem.deleteDirectory(path, options),
            );
            for (const filePath of filePaths) {
              await git.remove({
                ...gitParameters,
                filepath: gitRelativeFilePath(filePath),
              });
              removedFilePaths.push(filePath);
            }
          });
        },

        async deleteFile(
          path: string,
          options?: FileSystem.DeleteFileOptions,
        ): Promise<Either<ErrnoException, void>> {
          return EitherAsync(async ({ liftEither }) => {
            await liftEither(
              await underlyingFileSystem.deleteFile(path, options),
            );
            await git.remove({
              ...gitParameters,
              filepath: gitRelativeFilePath(path),
            });
            removedFilePaths.push(path);
          });
        },

        readDirectory(
          path: string,
          options?: FileSystem.ReadDirectoryOptions,
        ): Promise<Either<ErrnoException, readonly Dirent[]>> {
          return underlyingFileSystem.readDirectory(path, options);
        },

        readFile(path: string): Promise<Either<ErrnoException, Uint8Array>> {
          return underlyingFileSystem.readFile(path);
        },

        realpath(path: string): Promise<Either<ErrnoException, string>> {
          return underlyingFileSystem.realpath(path);
        },

        stat(path: string): Promise<Either<ErrnoException, Stat>> {
          return underlyingFileSystem.stat(path);
        },

        async writeFile(
          path: string,
          data: Uint8Array,
        ): Promise<Either<ErrnoException, void>> {
          return EitherAsync(async ({ liftEither }) => {
            await liftEither(await underlyingFileSystem.writeFile(path, data));
            await git.add({
              ...gitParameters,
              filepath: gitRelativeFilePath(path),
            });
            addedFilePaths.push(path);
          });
        },

        async writeFileStream<ReturnT>(
          path: string,
          write: (stream: Writable) => Promise<Either<Error, ReturnT>>,
        ): Promise<Either<Error, ReturnT>> {
          return EitherAsync(async ({ liftEither }) => {
            const result = await liftEither(
              await underlyingFileSystem.writeFileStream(path, write),
            );
            await git.add({
              ...gitParameters,
              filepath: gitRelativeFilePath(path),
            });
            addedFilePaths.push(path);
            return result;
          });
        },
      };

      const delegate = this.delegate({ fileSystem });

      await liftEither(await mutator(delegate));

      if (addedFilePaths.length === 0 && removedFilePaths.length === 0) {
        throw new Error("didn't add or remove any file paths from git");
      }

      const objectId = await git.commit({
        ...gitParameters,
        author: gitParameters.author ?? {
          name: "John Doe",
          email: "author@example.com",
        },
        message: addedFilePaths
          .map((filePath) => `add: ${this.gitRelativeFilePath(filePath)}`)
          .concat(
            removedFilePaths.map(
              (filePath) => `remove: ${this.gitRelativeFilePath(filePath)}`,
            ),
          )
          .join("\n"),
      });

      return { version: objectId };
    });
  }

  protected gitRelativeFilePath(path: string): string {
    return relative(this.gitParameters.dir, path);
  }
}

type GitParameters = {
  readonly author?: Parameters<typeof git.commit>[0]["author"];
  readonly dir: string;
  readonly fs: git.PromiseFsClient;
  readonly gitdir?: string;
};
