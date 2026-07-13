import { Readable } from "node:stream";
import type { Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { CompressedRdfStream, RdfDirectoryGraphStore } from "@rdfx/fs";
import type { GraphIdentifier } from "@rdfx/graph-store";
import * as git from "isomorphic-git";
import { type Either, EitherAsync, Maybe } from "purify-ts";
import type { Logger } from "ts-log";
import { Memoize } from "typescript-memoize";
import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfDirectoryGraphStore extends AbstractVersionedRdfFileGraphStore {
  constructor(
    path: string,
    options?: {
      gitParameters?: AbstractVersionedRdfFileGraphStore.GitParameters;
      logger?: Logger;
    },
  ) {
    super({
      gitParameters: options?.gitParameters ?? {
        dir: path,
      },
      logger: options?.logger,
      path,
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
            filepath: this.fileSystem.gitRelativeFilePath(
              this.delegate.graphFilePath(identifier),
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
        RdfDirectoryGraphStore.format,
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

  @Memoize()
  protected get delegate(): RdfDirectoryGraphStore {
    return new RdfDirectoryGraphStore(this.path, {
      fileSystem: this.fileSystem,
      logger: this.logger,
    });
  }
}
