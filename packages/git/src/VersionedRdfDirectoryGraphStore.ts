import { Readable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import {
  CompressedRdfStream,
  type FileSystem,
  RdfDirectoryGraphStore,
} from "@rdfx/fs";
import type { GraphIdentifier } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, Maybe } from "purify-ts";
import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfDirectoryGraphStore extends AbstractVersionedRdfFileGraphStore {
  constructor(
    path: string,
    options?: ConstructorParameters<
      typeof AbstractVersionedRdfFileGraphStore
    >[0],
  ) {
    super({
      gitParameters: options?.gitParameters ?? {
        dir: path,
      },
      logger: options?.logger,
      path,
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
            filepath: this.gitRelativeFilePath(
              this.delegate().graphFilePath(identifier),
            ),
          })
        ).blob;
      } catch (error) {
        if (error instanceof git.Errors.NotFoundError) {
          return Maybe.empty();
        } else {
          throw error;
        }
      }

      const stream = CompressedRdfStream.parse(
        RdfDirectoryGraphStore.fileFormat,
        Readable.from(Buffer.from(blob)),
      );

      return Maybe.of(
        identifier.termType === "DefaultGraph"
          ? stream
          : (stream as Readable).map((quad: Quad) =>
              dataFactory.quad(
                quad.subject,
                quad.predicate,
                quad.object,
                identifier,
              ),
            ),
      );
    });
  }

  protected delegate(options?: {
    fileSystem?: FileSystem;
  }): RdfDirectoryGraphStore {
    return new RdfDirectoryGraphStore(this.path, {
      ...options,
      logger: this.logger,
    });
  }
}
