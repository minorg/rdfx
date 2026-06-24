import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import { Either, EitherAsync, Maybe } from "purify-ts";
import { Readable } from "readable-stream";
import { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * A GraphStore implementation backed by an RDF/JS Dataset.
 */
export class RdfjsDatasetGraphStore implements GraphStore {
  constructor(private readonly dataset: DatasetCore) {}

  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async () => {
      for (const quad of this.dataset) {
        this.dataset.delete(quad);
      }
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return EitherAsync(async () => {
      for (const quad of this.dataset.match(null, null, null, identifier)) {
        this.dataset.delete(quad);
      }
      return {};
    });
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return EitherAsync(async () => {
      for (const _ of this.dataset.match(null, null, null, identifier)) {
        return true;
      }
      return false;
    });
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return EitherAsync(async () => {
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
    return Either.of(this.dataset.size === 0);
  }

  async get(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    for (const _ of this.dataset.match(null, null, null, identifier)) {
      return Either.of(
        Maybe.of(
          Readable.from(this.dataset.match(null, null, null, identifier)),
        ),
      );
    }
    return Either.of(Maybe.empty());
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return new Promise((resolve) => {
      quads.on("data", (quad: Quad) => {
        this.dataset.add(quad);
      });

      quads.on("end", () => {
        resolve(Either.of({}));
      });

      quads.on("error", (error) => resolve(Either.of(error)));
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

      quads.on("error", (error) => resolve(Either.of(error)));
    });
  }
}
