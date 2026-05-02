export const RDF_FORMATS = [
  "application/ld+json",
  "application/n-quads",
  "application/n-triples",
  "application/rdf+xml",
  "application/trig",
  "text/n3",
  "text/turtle",
] as const;

export type RdfFormat = (typeof RDF_FORMATS)[number];
