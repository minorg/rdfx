import type { Quad } from "@rdfjs/types";
import type { UncompressedRdfFormat } from "@rdfx/format";
import { Writer as N3Writer } from "n3";
import { Either } from "purify-ts";

export function serializeSync(
  input: Iterable<Quad>,
  options: {
    format: Extract<
      UncompressedRdfFormat["mimeType"],
      "application/n-quads" | "application/n-triples"
    >;
  },
): Either<Error, string> {
  return Either.encase(() => {
    const ntriples: string[] = [];
    const n3Writer = new N3Writer(options);
    for (const quad of input) {
      ntriples.push(
        n3Writer.quadToString(
          quad.subject,
          quad.predicate,
          quad.object,
          quad.graph,
        ),
      );
    }
    return ntriples.join("\n");
  });
}
