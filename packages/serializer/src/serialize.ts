import type { SerializerOptions as JsonLdSerializerOptions } from "@rdfjs/serializer-jsonld-ext";
import type { SerializerOptions as RdfjsSerializerOptions } from "@rdfjs/serializer-rdfjs";
import type { SerializerOptions as TurtleSerializerOptions } from "@rdfjs/serializer-turtle";
import type { Quad } from "@rdfjs/types";
import { iterableToStream, streamToString } from "@rdfx/stream";
import { EitherAsync } from "purify-ts";
import type { SerializerOptions as N3SerializerOptions } from "./N3Serializer.js";
import { serializers as serializersFactory } from "./serializers.js";

type SerializeOptions =
  | ({
      format: "application/ld+json";
    } & JsonLdSerializerOptions)
  | { format: "" }
  | {
      format: "application/n-quads";
    }
  | {
      format: "application/n-triples";
    }
  | ({
      format: "application/trig";
    } & N3SerializerOptions)
  | ({
      format: "text/javascript";
    } & RdfjsSerializerOptions)
  | ({
      format: "text/n3";
    } & N3SerializerOptions)
  | ({
      format: "text/turtle";
    } & TurtleSerializerOptions);

export async function serialize(
  input: Iterable<Quad>,
  options: SerializeOptions,
) {
  return EitherAsync(async ({ liftEither }) => {
    const serializersOptions: Parameters<typeof serializersFactory>[0] = {};
    switch (options.format) {
      case "application/ld+json":
        serializersOptions.jsonLd = options;
        break;
      case "application/n-quads":
      case "application/n-triples":
        break;
      case "application/trig":
        serializersOptions.trig = options;
        break;
      case "text/javascript":
        serializersOptions.rdfjs = options;
        break;
      case "text/n3":
        serializersOptions.n3 = options;
        break;
      case "text/turtle":
        serializersOptions.turtle = options;
        break;
    }

    const serializers = serializersFactory(serializersOptions);
    const stream = serializers.import(options.format, iterableToStream(input));
    if (stream === null) {
      throw new RangeError(`unsupported format: ${options.format}`);
    }
    return await liftEither(await streamToString(stream));
  });
}
