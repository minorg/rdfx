import type { BaseQuad, Quad, Stream } from "@rdfjs/types";
import { Either, Left } from "purify-ts";

/**
 * Converts an RDF/JS Stream of Quads into an array of Quads.
 */
export function streamToArray<Q extends BaseQuad = Quad>(
  stream: Stream<Q>,
): Promise<Either<Error, readonly Q[]>> {
  return new Promise((resolve) => {
    const quads: Q[] = [];
    stream.on("data", (quad) => quads.push(quad));
    stream.on("end", () => resolve(Either.of(quads)));
    stream.on("error", (error) => resolve(Left(error)));
  });
}
