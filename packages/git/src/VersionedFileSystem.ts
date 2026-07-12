import fs from "node:fs";
import { join, relative } from "node:path";
import type { Readable, Writable } from "node:stream";
import type { Dirent, ErrnoException, FileSystem, Stat } from "@rdfx/fs";
import * as git from "isomorphic-git";
import { type Either, EitherAsync } from "purify-ts";

/**
 * FileSystem implementation that git adds/removes files that are written or deleted successfully from the underlying node:fs.
 */
export class VersionedFileSystem implements FileSystem {
  private readonly delegate: FileSystem;

  readonly gitParameters: VersionedFileSystem.GitParameters & {
    readonly fs: git.PromiseFsClient;
  };

  constructor({
    delegate,
    gitParameters,
  }: {
    delegate: FileSystem;
    gitParameters: VersionedFileSystem.GitParameters;
  }) {
    this.delegate = delegate;
    this.gitParameters = { ...gitParameters, fs: fs.promises };
  }

  createDirectory(
    path: string,
    options?: FileSystem.CreateDirectoryOptions,
  ): Promise<Either<ErrnoException, void>> {
    return this.delegate.createDirectory(path, options);
  }

  createReadStream(path: string): Readable {
    return this.delegate.createReadStream(path);
  }

  async deleteDirectory(
    path: string,
    options?: FileSystem.DeleteDirectoryOptions,
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(async ({ liftEither }) => {
      const filePaths = (
        await liftEither(await this.delegate.readDirectory(path, options))
      )
        .filter((dirent) => dirent.isFile())
        .map((dirent) => join(dirent.parentPath, dirent.name));
      await liftEither(await this.delegate.deleteDirectory(path, options));
      for (const filePath of filePaths) {
        await git.remove({
          ...this.gitParameters,
          filepath: this.gitFilePath(filePath),
        });
      }
    });
  }

  async deleteFile(
    path: string,
    options?: FileSystem.DeleteFileOptions,
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.deleteFile(path, options));
      await git.remove({
        ...this.gitParameters,
        filepath: this.gitFilePath(path),
      });
    });
  }

  gitFilePath(path: string): string {
    return relative(this.gitParameters.dir, path);
  }

  readDirectory(
    path: string,
    options?: FileSystem.ReadDirectoryOptions,
  ): Promise<Either<ErrnoException, readonly Dirent[]>> {
    return this.delegate.readDirectory(path, options);
  }

  readFile(path: string): Promise<Either<ErrnoException, Uint8Array>> {
    return this.delegate.readFile(path);
  }

  realpath(path: string): Promise<Either<ErrnoException, string>> {
    return this.delegate.realpath(path);
  }

  stat(path: string): Promise<Either<ErrnoException, Stat>> {
    return this.delegate.stat(path);
  }

  async writeFile(
    path: string,
    data: Uint8Array,
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.writeFile(path, data));
      await git.add({
        ...this.gitParameters,
        filepath: this.gitFilePath(path),
      });
    });
  }

  async writeFileStream<ReturnT>(
    path: string,
    write: (stream: Writable) => Promise<Either<Error, ReturnT>>,
  ): Promise<Either<Error, ReturnT>> {
    return EitherAsync(async ({ liftEither }) => {
      const result = await liftEither(
        await this.delegate.writeFileStream(path, write),
      );
      await git.add({
        ...this.gitParameters,
        filepath: this.gitFilePath(path),
      });
      return result;
    });
  }
}

export namespace VersionedFileSystem {
  export interface GitParameters {
    readonly dir: string;
    readonly gitdir?: string;
  }
}
