import type { Stream } from "@rdfjs/types";

import type { Either, Maybe } from "purify-ts";

import type { GraphIdentifier } from "./GraphIdentifier.js";

/**
 * Graph store abstraction, modeled on the SPARQL 1.1 Graph Store HTTP Protocol (https://www.w3.org/TR/sparql11-http-rdf-update/).
 */
export interface GraphStore<
  ClearOptionsT extends object = object,
  ClearReturnT extends object = object,
  DeleteOptionsT extends object = object,
  DeleteReturnT extends object = object,
  GetOptionsT extends object = object,
  HeadOptionsT extends object = object,
  PostOptionsT extends object = object,
  PostReturnT extends object = object,
  PutOptionsT extends object = object,
  PutReturnT extends object = object,
> {
  /**
   * Clear the store.
   */
  clear(options?: ClearOptionsT): Promise<Either<Error, ClearReturnT>>;

  /**
   * Delete a graph.
   */
  delete(
    identifier: GraphIdentifier,
    options?: DeleteOptionsT,
  ): Promise<Either<Error, DeleteReturnT>>;

  /**
   * Get the triples of the named graph.
   */
  get(
    identifier: GraphIdentifier,
    options?: GetOptionsT,
  ): Promise<Either<Error, Maybe<Stream>>>;

  /**
   * Does the store have the named graph?
   */
  head(
    identifier: GraphIdentifier,
    options?: HeadOptionsT,
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
  post(
    quads: Stream,
    options?: PostOptionsT,
  ): Promise<Either<Error, PostReturnT>>;

  /**
   * Add quads, clearing the quads' graphs first.
   */
  put(quads: Stream, options?: PutOptionsT): Promise<Either<Error, PutReturnT>>;
}
