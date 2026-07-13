import { dirname } from "node:path";
import { Readable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import { CompressedRdfStream, RdfFileGraphStore, RdfFormat } from "@rdfx/fs";
import type { GraphIdentifier } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, Maybe } from "purify-ts";
import type { Logger } from "ts-log";
import { Memoize } from "typescript-memoize";
import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfFileGraphStore extends AbstractVersionedRdfFileGraphStore {
  private readonly format: RdfFormat;

  constructor(
    path: string,
    options?: {
      format?: RdfFormat;
      gitParameters?: AbstractVersionedRdfFileGraphStore.GitParameters;
      logger?: Logger;
    },
  ) {
    super({
      gitParameters: options?.gitParameters ?? {
        dir: dirname(path),
      },
      logger: options?.logger,
      path,
    });
    this.format = options?.format ?? RdfFormat.fromPath(path).unsafeCoerce();
  }

  @Memoize()
  protected get delegate(): RdfFileGraphStore {
    return new RdfFileGraphStore(this.path, {
      fileSystem: this.fileSystem,
      format: this.format,
      logger: this.logger,
    });
  }

  override async get(
    identifier: GraphIdentifier,
    options?: { readonly version?: string },
  ): Promise<Either<Error, Maybe<Stream>>> {
    const version = options?.version;
    if (!version) {
      return this.delegate.get(identifier);
    }

    return EitherAsync<Error, Maybe<Stream>>(async () => {
      let blob: Uint8Array;
      try {
        blob = (
          await git.readBlob({
            ...this.gitParameters,
            oid: version,
            filepath: this.fileSystem.gitRelativeFilePath(this.path),
          })
        ).blob;
      } catch (error) {
        if (error instanceof git.Errors.NotFoundError) {
          return Maybe.empty();
        } else {
          throw error;
        }
      }

      return Maybe.of(
        (
          CompressedRdfStream.parse(
            this.format,
            Readable.from(Buffer.from(blob)),
          ) as Readable
        ).filter((quad: Quad) => quad.graph.equals(identifier)),
      );
    });
  }
}
