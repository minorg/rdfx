import TurtleSerializer, {
  type SerializerOptions as TurtleSerializerOptions,
} from "@rdfjs/serializer-turtle";
import type { Quad } from "@rdfjs/types";
import { Writer as N3Writer } from "n3";
import { Either } from "purify-ts";

type SerializeSyncOptions =
  | {
      format: "application/n-quads";
    }
  | {
      format: "application/n-triples";
    }
  | ({
      format: "text/turtle";
    } & TurtleSerializerOptions);

export function serializeSync(
  input: Iterable<Quad>,
  options: SerializeSyncOptions,
): Either<Error, string> {
  return Either.encase(() => {
    switch (options.format) {
      case "application/n-quads":
      case "application/n-triples": {
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
      }
      case "text/turtle":
        return new TurtleSerializer(options).transform(input);
    }
  });
}
