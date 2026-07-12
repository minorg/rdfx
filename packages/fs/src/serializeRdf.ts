import type { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import type { Quad, Stream } from "@rdfjs/types";
import serializers from "@rdfx/serializers";
import { type Either, EitherAsync } from "purify-ts";
import { RdfFormat } from "./RdfFormat.js";

export async function serializeRdf({
  destination,
  format,
  serializerOptions,
  source,
}: {
  destination: Writable;
  format: RdfFormat;
  serializerOptions?: Parameters<typeof serializers>[0];
  source: Stream<Quad>;
}): Promise<Either<Error, void>> {
  return EitherAsync(async () => {
    const uncompressedMimeType = RdfFormat.isCompressed(format)
      ? format.uncompressedMimeType
      : format.mimeType;

    const rdfStream = serializers(serializerOptions).import(
      uncompressedMimeType,
      source,
    );

    if (rdfStream === null) {
      throw new RangeError(
        `unsupported RDF serialization format: ${uncompressedMimeType}`,
      );
    }

    if (RdfFormat.isCompressed(format)) {
      let compressor: Transform;
      switch (format.mimeType) {
        case "application/gzip":
          compressor = zlib.createGzip();
          break;
        case "application/x-brotli":
          compressor = zlib.createBrotliCompress();
          break;
        case "application/x-bzip2":
          throw new RangeError("bzip2 compression unsupported");
      }

      await pipeline(rdfStream as unknown as Readable, compressor, destination);
    } else {
      await pipeline(rdfStream as unknown as Readable, destination);
    }
  });
}
