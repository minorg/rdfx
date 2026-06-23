import type { Stream } from "@rdfjs/types";

import type { Either, Maybe } from "purify-ts";

import type { GraphIdentifier } from "./GraphIdentifier.js";

/**
 * Graph store abstraction, modeled on the SPARQL 1.1 Graph Store HTTP Protocol (https://www.w3.org/TR/sparql11-http-rdf-update/).
 */
export interface GraphStore<VersionT = void> {
  /**
   * Clear the store.
   */
  clear(): Promise<Either<Error, void>>;

  /**
   * Delete a graph.
   *
   * Returns the new version of the store.
   */
  delete(identifier: GraphIdentifier): Promise<Either<Error, VersionT>>;

  /**
   * Get the triples of the named graph at the given version.
   */
  get(
    identifier: GraphIdentifier,
    version?: VersionT,
  ): Promise<Either<Error, Maybe<Stream>>>;

  /**
   * Does the store have the named graph at the given version?
   */
  head(
    identifier: GraphIdentifier,
    version?: VersionT,
  ): Promise<Either<Error, boolean>>;

  /**
   * Test if the entire store is empty.
   */
  isEmpty(): Promise<Either<Error, boolean>>;

  /**
   * Add quads without clearing quads' graphs first.
   *
   * Returns the new version of the store.
   */
  post(quads: Stream): Promise<Either<Error, VersionT>>;

  /**
   * Add quads, clearing the quads' graphs first.
   *
   * Returns the new version of the store.
   */
  put(quads: Stream): Promise<Either<Error, VersionT>>;
}
