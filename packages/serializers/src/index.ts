import JsonLdSerializer, {
  type SerializerOptions as JsonLdSerializerOptions,
} from "@rdfjs/serializer-jsonld-ext";
export { JsonLdSerializer, type JsonLdSerializerOptions };

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
  rdfjs?: RdfjsSerializerOptions;
  turtle?: TurtleSerializerOptions;
}) {
  return new SinkMap([
    ["application/ld+json", new JsonLdSerializer(options?.jsonLd)],
    ["application/n-quads", new NTriplesSerializer()],
    ["application/n-triples", new NTriplesSerializer()],
    ["text/javascript", new RdfjsSerializer(options?.rdfjs)],
    ["text/turtle", new TurtleSerializer(options?.turtle)],
  ]);
}
