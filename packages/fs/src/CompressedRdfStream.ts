import type { Readable, Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import type { Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import parsersFactory from "@rdfx/parsers";
import serializers from "@rdfx/serializers";
import { type Either, EitherAsync } from "purify-ts";
import bz2 from "unbzip2-stream";
import { RdfFormat } from "./RdfFormat.js";
import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";

const parsers = parsersFactory({ dataFactory });

export namespace CompressedRdfStream {
  export function parse(format: RdfFormat, input: Readable): Stream<Quad> {
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

  export async function serialize({
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

        await pipeline(
          rdfStream as unknown as Readable,
          compressor,
          destination,
        );
      } else {
        await pipeline(rdfStream as unknown as Readable, destination);
      }
    });
  }
}
