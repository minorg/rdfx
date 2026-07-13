import type { Readable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import {
  NodeFileSystem,
  type RdfDirectoryGraphStore,
  type RdfFileGraphStore,
} from "@rdfx/fs";
import type { GraphIdentifier, VersionedGraphStore } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, type Maybe } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import { VersionedFileSystem } from "./VersionedFileSystem.js";

export abstract class AbstractVersionedRdfFileGraphStore
  implements VersionedGraphStore<string>
{
  protected abstract readonly delegate:
    | RdfDirectoryGraphStore
    | RdfFileGraphStore;
  protected readonly fileSystem: VersionedFileSystem;
  protected readonly gitParameters: AbstractVersionedRdfFileGraphStore.GitParameters & {
    readonly fs: git.PromiseFsClient;
  };
  protected readonly logger: Logger;

  readonly path: string;

  protected constructor({
    gitParameters,
    logger,
    path,
  }: {
    gitParameters: AbstractVersionedRdfFileGraphStore.GitParameters;
    logger?: Logger;
    path: string;
  }) {
    this.fileSystem = new VersionedFileSystem({
      delegate: NodeFileSystem.instance,
      gitParameters,
    });
    this.gitParameters = {
      ...gitParameters,
      fs: this.fileSystem.gitParameters.fs,
    };
    this.logger = logger ?? dummyLogger;
    this.path = path;
  }

  async clear(): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.clear());
      return await liftEither(await this.commit());
    });
  }

  async delete(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.delete(identifier));
      return await liftEither(await this.commit());
    });
  }

  abstract get(
    identifier: GraphIdentifier,
    options?: { readonly version?: string },
  ): Promise<Either<Error, Maybe<Stream>>>;

  async head(
    identifier: GraphIdentifier,
    options?: { readonly version?: string },
  ): Promise<Either<Error, boolean>> {
    if (!options?.version) {
      return this.delegate.head(identifier);
    }

    return EitherAsync(async ({ liftEither }) => {
      const stream = (
        await liftEither(await this.get(identifier, options))
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
    return this.delegate.identifiers();
  }

  isEmpty(): Promise<Either<Error, boolean>> {
    return this.delegate.isEmpty();
  }

  async post(
    quads: Stream,
  ): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.post(quads));
      return await liftEither(await this.commit());
    });
  }

  async put(
    quads: Stream,
  ): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.delegate.put(quads));
      return await liftEither(await this.commit());
    });
  }

  private async commit(): Promise<Either<Error, { readonly version: string }>> {
    return EitherAsync(async () => {
      const objectId = await git.commit({
        ...this.gitParameters,
        author: this.gitParameters.author ?? {
          name: "John Doe",
          email: "author@example.com",
        },
      });
      return { version: objectId };
    });
  }
}

export namespace AbstractVersionedRdfFileGraphStore {
  export interface GitParameters extends VersionedFileSystem.GitParameters {
    author?: Parameters<typeof git.commit>[0]["author"];
  }
}
