import type { Readable } from "node:stream";
import zlib from "node:zlib";
import type { Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import parsersFactory from "@rdfx/parsers";
import bz2 from "unbzip2-stream";
import { RdfFormat } from "./RdfFormat.js";
import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";

const parsers = parsersFactory({ dataFactory });

export function parseRdf(format: RdfFormat, input: Readable): Stream<Quad> {
  let uncompressedMimeType: UncompressedRdfFormat["mimeType"];
  if (RdfFormat.isCompressed(format)) {
    switch (format.mimeType) {
      case "application/gzip":
        input = input.pipe(zlib.createGunzip());
        break;
      case "application/x-brotli":
        input = input.pipe(zlib.createBrotliDecompress());
        break;
      case "application/x-bzip2":
        input = input.pipe(bz2());
        break;
    }

    uncompressedMimeType = format.uncompressedMimeType;
  } else {
    uncompressedMimeType = format.mimeType;
  }

  const output = parsers.import(uncompressedMimeType, input);
  if (output === null) {
    throw new RangeError(
      `unsupported RDF serialization format: ${uncompressedMimeType}`,
    );
  }
  return output;
}
