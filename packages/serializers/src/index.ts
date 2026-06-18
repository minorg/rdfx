import JsonLdSerializer, {
  type SerializerOptions as JsonLdSerializerOptions,
} from "@rdfjs/serializer-jsonld-ext";
export { JsonLdSerializer, type JsonLdSerializerOptions };

import N3Serializer, {
  type SerializerOptions as N3SerializerOptions,
} from "./N3Serializer.js";
export { N3Serializer, type N3SerializerOptions };

import NTriplesSerializer from "@rdfjs/serializer-ntriples";
export { NTriplesSerializer };

import RdfjsSerializer, {
  type SerializerOptions as RdfjsSerializerOptions,
} from "@rdfjs/serializer-rdfjs";
export { RdfjsSerializer, type RdfjsSerializerOptions };

import TurtleSerializer, {
  type SerializerOptions as TurtleSerializerOptions,
} from "@rdfjs/serializer-turtle";
export { TurtleSerializer, type TurtleSerializerOptions };

import SinkMap from "@rdfjs/sink-map";

export default function serializers(options?: {
  jsonLd?: JsonLdSerializerOptions;
  n3?: N3SerializerOptions;
  rdfjs?: RdfjsSerializerOptions;
  trig?: N3SerializerOptions;
  turtle?: TurtleSerializerOptions;
}) {
  return new SinkMap([
    ["application/ld+json", new JsonLdSerializer(options?.jsonLd)],
    ["application/n-quads", new NTriplesSerializer()],
    ["application/n-triples", new NTriplesSerializer()],
    [
      "application/trig",
      new N3Serializer({ ...options?.trig, format: "application/trig" }),
    ],
    [
      "application/trig",
      new N3Serializer({ ...options?.trig, format: "application/trig" }),
    ],
    ["text/javascript", new RdfjsSerializer(options?.rdfjs)],
    ["text/n3", new N3Serializer({ ...options?.n3, format: "text/n3" })],
    ["text/turtle", new TurtleSerializer(options?.turtle)],
  ]);
}
