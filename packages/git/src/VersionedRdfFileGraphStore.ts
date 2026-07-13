import { dirname } from "node:path";
import { Readable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import {
  CompressedRdfStream,
  type FileSystem,
  RdfFileGraphStore,
  RdfFormat,
} from "@rdfx/fs";
import type { GraphIdentifier } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, Maybe } from "purify-ts";
import { Memoize } from "typescript-memoize";

import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfFileGraphStore extends AbstractVersionedRdfFileGraphStore {
  private readonly format: RdfFormat;

  constructor(
    path: string,
    options?: Partial<
      ConstructorParameters<typeof AbstractVersionedRdfFileGraphStore>[1]
    > & { format?: RdfFormat },
  ) {
    super(path, {
      gitParameters: options?.gitParameters ?? {
        dir: dirname(path),
      },
      logger: options?.logger,
    });
    this.format = options?.format ?? RdfFormat.fromPath(path).unsafeCoerce();
  }

  @Memoize()
  protected delegate(options?: { fileSystem?: FileSystem }): RdfFileGraphStore {
    return new RdfFileGraphStore(this.path, {
      ...options,
      format: this.format,
      logger: this.logger,
    });
  }

  protected override async getVersion(
    identifier: GraphIdentifier,
    version: string,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return EitherAsync<Error, Maybe<Stream>>(async () => {
      let blob: Uint8Array;
      try {
        blob = (
          await git.readBlob({
            ...this.gitParameters,
            oid: version,
            filepath: this.gitRelativeFilePath(this.path),
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
