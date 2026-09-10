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

import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import SinkMap from "@rdfjs/sink-map";

export default function serializers(options?: {
  // Common options
  baseIRI?: string;
  prefixes?: PrefixMap;

  // Serializer-specific options, will override common options
  jsonLd?: JsonLdSerializerOptions;
  n3?: N3SerializerOptions;
  rdfjs?: RdfjsSerializerOptions;
  trig?: N3SerializerOptions;
  turtle?: TurtleSerializerOptions;
}) {
  const commonSerializerOptions = {
    baseIRI: options?.baseIRI,
    prefixes: options?.prefixes,
  };

  return new SinkMap([
    [
      "application/ld+json",
      new JsonLdSerializer({ ...commonSerializerOptions, ...options?.jsonLd }),
    ],

    ["application/n-quads", new NTriplesSerializer()],

    ["application/n-triples", new NTriplesSerializer()],

    [
      "application/trig",
      new N3Serializer({
        ...commonSerializerOptions,
        ...options?.trig,
        format: "application/trig",
      }),
    ],

    ["text/javascript", new RdfjsSerializer(options?.rdfjs)],

    [
      "text/n3",
      new N3Serializer({
        ...commonSerializerOptions,
        ...options?.n3,
        format: "text/n3",
      }),
    ],

    [
      "text/turtle",
      new TurtleSerializer({ ...commonSerializerOptions, ...options?.turtle }),
    ],
  ]);
}
