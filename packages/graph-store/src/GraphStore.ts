import type { BaseQuad, Quad, Stream } from "@rdfjs/types";

import type { Either } from "purify-ts";

import type { GraphIdentifier } from "./GraphIdentifier.js";

/**
 * Graph store abstraction, modeled on the SPARQL 1.1 Graph Store HTTP Protocol (https://www.w3.org/TR/sparql11-http-rdf-update/).
 */
export interface GraphStore<QuadT extends BaseQuad = Quad> {
  /**
   * Clear the store.
   */
  clear(): Promise<Either<Error, void>>;

  /**
   * Delete a graph.
   */
  delete(identifier: GraphIdentifier): Promise<Either<Error, void>>;

  /**
   * Get the triples of the named graph.
   */
  get(identifier: GraphIdentifier): Stream<QuadT>;

  /**
   * Does the store have the named graph?
   */
  head(identifier: GraphIdentifier): Promise<Either<Error, boolean>>;

  /**
   * Test if the entire store is empty.
   */
  isEmpty(): Promise<Either<Error, boolean>>;

  /**
   * Add quads without clearing quads' graphs first.
   */
  post(quads: Stream<QuadT>): Promise<Either<Error, void>>;

  /**
   * Add quads, clearing the quads' graphs first.
   */
  put(quads: Stream<QuadT>): Promise<Either<Error, void>>;
}
