import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import { iterableToStream } from "@rdfx/stream";

import { Either, Left, Maybe } from "purify-ts";

import { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * A GraphStore implementation backed by an RDF/JS Dataset.
 */
export class RdfjsDatasetGraphStore implements GraphStore {
  constructor(readonly dataset: DatasetCore) {}

  async clear(): Promise<Either<Error, object>> {
    return this.clearSync();
  }

  clearSync(): Either<Error, object> {
    return Either.encase(() => {
      for (const quad of this.dataset) {
        this.dataset.delete(quad);
      }
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return this.deleteSync(identifier);
  }

  deleteSync(identifier: GraphIdentifier): Either<Error, object> {
    return Either.encase(() => {
      for (const quad of this.dataset.match(null, null, null, identifier)) {
        this.dataset.delete(quad);
      }
      return {};
    });
  }

  async get(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return this.getStreamSync(identifier);
  }

  getDatasetSync(
    identifier: GraphIdentifier,
  ): Either<Error, Maybe<DatasetCore>> {
    return Either.encase(() => {
      for (const _ of this.dataset.match(null, null, null, identifier)) {
        return Maybe.of(this.dataset.match(null, null, null, identifier));
      }
      return Maybe.empty();
    });
  }

  getStreamSync(identifier: GraphIdentifier): Either<Error, Maybe<Stream>> {
    return this.getDatasetSync(identifier).map((datasetMaybe) =>
      datasetMaybe.map(iterableToStream),
    );
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return this.headSync(identifier);
  }

  headSync(identifier: GraphIdentifier): Either<Error, boolean> {
    return Either.encase(() => {
      for (const _ of this.dataset.match(null, null, null, identifier)) {
        return true;
      }
      return false;
    });
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return this.identifiersSync();
  }

  identifiersSync(): Either<Error, readonly GraphIdentifier[]> {
    return Either.encase(() => {
      const identifiers = new Map<string, GraphIdentifier>();
      for (const quad of this.dataset.match()) {
        switch (quad.graph.termType) {
          case "DefaultGraph":
            identifiers.set("", quad.graph);
            break;
          case "NamedNode":
            identifiers.set(quad.graph.value, quad.graph);
            break;
        }
      }
      return [...identifiers.values()];
    });
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return this.isEmptySync();
  }

  isEmptySync(): Either<Error, boolean> {
    return Either.of(this.dataset.size === 0);
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return new Promise((resolve) => {
      quads
        .on("data", (quad: Quad) => {
          this.dataset.add(quad);
        })
        .on("end", () => {
          resolve(Either.of({}));
        })
        .on("error", (error) => {
          resolve(Left(error));
        });
    });
  }

  async put(quads: Stream): Promise<Either<Error, object>> {
    const clearedGraphIdentifiers = new Set<string>();
    return new Promise((resolve) => {
      quads.on("data", (quad: Quad) => {
        const graphIdentifierString = GraphIdentifier.stringify(
          GraphIdentifier.fromQuadGraph(quad.graph).unsafeCoerce(),
        );

        if (!clearedGraphIdentifiers.has(graphIdentifierString)) {
          for (const deleteQuad of this.dataset.match(
            null,
            null,
            null,
            quad.graph,
          )) {
            this.dataset.delete(deleteQuad);
          }
          clearedGraphIdentifiers.add(graphIdentifierString);
        }

        this.dataset.add(quad);
      });

      quads.on("end", () => {
        resolve(Either.of({}));
      });

      quads.on("error", (error) => resolve(Left(error)));
    });
  }
}
