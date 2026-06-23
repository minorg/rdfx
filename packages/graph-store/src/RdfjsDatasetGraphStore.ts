import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import { Either, EitherAsync, Maybe } from "purify-ts";
import { Readable } from "readable-stream";
import type { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * A GraphStore implementation backed by an RDF/JS Dataset.
 */
export class RdfjsDatasetGraphStore implements GraphStore<void> {
  constructor(private readonly dataset: DatasetCore) {}

  async clear(): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      for (const quad of this.dataset) {
        this.dataset.delete(quad);
      }
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      for (const quad of this.dataset.match(null, null, null, identifier)) {
        this.dataset.delete(quad);
      }
    });
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return EitherAsync(async () => this.#hasNamedGraph(identifier));
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

  async post(quads: Stream): Promise<Either<Error, void>> {
    return new Promise((resolve) => {
      quads.on("data", (quad: Quad) => {
        this.dataset.add(quad);
      });

      quads.on("end", () => {
        resolve(Either.of(undefined));
      });

      quads.on("error", (error) => resolve(Either.of(error)));
    });
  }

  async put(quads: Stream): Promise<Either<Error, void>> {
    const clearedGraphIdentifiers = new Set<string>();
    return new Promise((resolve) => {
      quads.on("data", (quad: Quad) => {
        let graphIdentifierString: string;
        switch (quad.graph.termType) {
          case "DefaultGraph":
            graphIdentifierString = "";
            break;
          case "NamedNode":
            graphIdentifierString = quad.graph.value;
            break;
          default:
            throw new RangeError(quad.graph.termType);
        }

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
        resolve(Either.of(undefined));
      });

      quads.on("error", (error) => resolve(Either.of(error)));
    });
  }

  #hasNamedGraph(identifier: GraphIdentifier): boolean {
    for (const _ of this.dataset.match(null, null, null, identifier)) {
      return true;
    }
    return false;
  }
}
