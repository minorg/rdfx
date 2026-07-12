export const RDF_FORMATS = [] as const;

export interface UncompressedRdfFormat {
  readonly lineOriented: boolean;
  readonly mimeType:
    | "application/ld+json"
    | "application/n-quads"
    | "application/n-triples"
    | "application/rdf+xml"
    | "application/trig"
    | "text/n3"
    | "text/turtle";
  readonly supportsQuads: boolean;
}
