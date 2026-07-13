import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";
import { uncompressedRdfFormats } from "./uncompressedRdfFormats.js";

export const uncompressedRdfFormatsByMimeType = uncompressedRdfFormats.reduce(
  (acc, uncompressedRdfFormat) => {
    acc[uncompressedRdfFormat.mimeType] = uncompressedRdfFormat;
    return acc;
  },
  {} as Record<UncompressedRdfFormat["mimeType"], UncompressedRdfFormat>,
);
