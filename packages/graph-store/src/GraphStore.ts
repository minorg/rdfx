import type { Stream } from "@rdfjs/types";

import type { Either, Maybe } from "purify-ts";

import type { GraphIdentifier } from "./GraphIdentifier.js";

/**
 * Graph store abstraction, modeled on the SPARQL 1.1 Graph Store HTTP Protocol (https://www.w3.org/TR/sparql11-http-rdf-update/).
 */
export interface GraphStore {
  /**
   * Clear the store.
   */
  clear(): Promise<Either<Error, void>>;

  /**
   * Delete a graph.
   */
  delete(
    identifier: GraphIdentifier,
    options?: object,
  ): Promise<Either<Error, object>>;

  /**
   * Get the triples of the named graph.
   */
  get(
    identifier: GraphIdentifier,
    options?: object,
  ): Promise<Either<Error, Maybe<Stream>>>;

  /**
   * Does the store have the named graph?
   */
  head(
    identifier: GraphIdentifier,
    options?: object,
  ): Promise<Either<Error, boolean>>;

  /**
   * Get a list of the store's graph identifiers.
   */
  identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>>;

  /**
   * Test if the entire store is empty.
   */
  isEmpty(): Promise<Either<Error, boolean>>;

  /**
   * Add quads without clearing quads' graphs first.
   */
  post(quads: Stream, options?: object): Promise<Either<Error, object>>;

  /**
   * Add quads, clearing the quads' graphs first.
   */
  put(quads: Stream, options?: object): Promise<Either<Error, object>>;
}
