import type { CompressionMethod } from "./CompressionMethod.js";
import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";

export interface CompressedRdfFormat
  extends Omit<UncompressedRdfFormat, "mimeType"> {
  readonly mimeType: CompressionMethod;
  readonly uncompressedMimeType: UncompressedRdfFormat["mimeType"];
}
