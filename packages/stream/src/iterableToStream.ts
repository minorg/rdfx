import type { BaseQuad, Quad, Stream } from "@rdfjs/types";
import { Readable } from "readable-stream";

/**
 * Converts an Iterable or AsyncIterable of Quads into an RDF/JS Stream.
 */
export function iterableToStream<Q extends BaseQuad = Quad>(
  iterable: Iterable<Q> | AsyncIterable<Q>,
): Stream {
  return Readable.from(iterable, {
    highWaterMark: 16,
    objectMode: true,
  });
}
