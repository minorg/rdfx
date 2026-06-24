import type { Stream } from "@rdfjs/types";
import type { Either, Maybe } from "purify-ts";
import type { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * GraphStore specialization that supports retrieving versions of named graphs.
 *
 * Writes to the store return the new version of the store. Versions are intentionally opaque.
 */
export interface VersionedGraphStore<VersionT> extends GraphStore {
  /**
   * Get the triples of a graph at the given version.
   *
   * If the version isn't specified, defaults to the latest version.
   */
  get(
    identifier: GraphIdentifier,
    options?: { version: VersionT },
  ): Promise<Either<Error, Maybe<Stream>>>;

  /**
   * Does a named graph with the given version exist?
   *
   * If the version isn't specified, defaults to the latest version.
   */
  head(
    identifier: GraphIdentifier,
    options?: { version: VersionT },
  ): Promise<Either<Error, boolean>>;

  /**
   * Add quads without clearing quads' graphs first.
   *
   * Returns the new version of the store.
   */
  post(
    quads: Stream,
    options?: object,
  ): Promise<Either<Error, { version: VersionT }>>;

  /**
   * Add quads, clearing the quads' graphs first.
   *
   * Returns the new version of the store.
   */
  put(
    quads: Stream,
    options?: object,
  ): Promise<Either<Error, { version: VersionT }>>;
}
