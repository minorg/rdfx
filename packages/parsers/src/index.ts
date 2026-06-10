import JsonLdParser, { type ParserOptions } from "@rdfjs/parser-jsonld";
export { JsonLdParser };

import N3Parser from "@rdfjs/parser-n3";
export { N3Parser };

import SinkMap from "@rdfjs/sink-map";

import type { DataFactory } from "@rdfjs/types";

export default function parsers({
  dataFactory,
  ...otherOptions
}: { dataFactory: DataFactory } & Omit<ParserOptions, "factory">) {
  const options = { ...otherOptions, factory: dataFactory };

  const n3Parser = new N3Parser(options);

  return new SinkMap([
    ["application/ld+json", new JsonLdParser(options)],
    ["application/trig", n3Parser],
    ["application/n-quads", n3Parser],
    ["application/n-triples", n3Parser],
    ["text/n3", n3Parser],
    ["text/turtle", n3Parser],
  ]);
}
