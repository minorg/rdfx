import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";

export const uncompressedRdfFormats: readonly UncompressedRdfFormat[] = [
  {
    lineOriented: false,
    mimeType: "application/ld+json",
    supportsQuads: true,
  },
  {
    lineOriented: true,
    mimeType: "application/n-quads",
    supportsQuads: false,
  },
  {
    lineOriented: true,
    mimeType: "application/n-triples",
    supportsQuads: false,
  },
  {
    lineOriented: false,
    mimeType: "application/trig",
    supportsQuads: true,
  },
  {
    lineOriented: false,
    mimeType: "text/n3",
    supportsQuads: false,
  },
  {
    lineOriented: false,
    mimeType: "text/turtle",
    supportsQuads: false,
  },
] as const;
