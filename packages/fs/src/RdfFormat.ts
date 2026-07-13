import path from "node:path";
import { Mime } from "mime";
import otherMimeTypes from "mime/types/other.js";
import standardMimeTypes from "mime/types/standard.js";
import { type Either, Left, Right } from "purify-ts";
import type { CompressedRdfFormat } from "./CompressedRdfFormat.js";
import type { CompressionMethod } from "./CompressionMethod.js";
import { compressionMethods } from "./compressionMethods.js";
import type { UncompressedRdfFormat } from "./UncompressedRdfFormat.js";
import { uncompressedRdfFormatsByMimeType } from "./uncompressedRdfFormatsByMimeType.js";

const compressionMethodsSet = new Set<string>(compressionMethods);

const mime = new Mime(standardMimeTypes, otherMimeTypes, {
  "application/x-brotli": ["br"],
});

export type RdfFormat = CompressedRdfFormat | UncompressedRdfFormat;

export namespace RdfFormat {
  export function fromPath(filePath: string): Either<Error, RdfFormat> {
    const mimeType = mime.getType(filePath);
    if (mimeType === null) {
      return Left(new Error(`unable to infer MIME type of ${filePath}`));
    }

    if (compressionMethodsSet.has(mimeType)) {
      const uncompressedFileName = path.basename(
        path.basename(filePath),
        path.extname(filePath),
      );

      const uncompressedMimeType = mime.getType(uncompressedFileName);
      if (uncompressedMimeType === null) {
        return Left(
          new Error(`unable to infer MIME type of ${uncompressedFileName}`),
        );
      }

      const uncompressedRdfFormat = (
        uncompressedRdfFormatsByMimeType as Record<
          string,
          UncompressedRdfFormat
        >
      )[uncompressedMimeType];
      if (uncompressedRdfFormat === undefined) {
        return Left(
          new Error(
            `${filePath} has a non-RDF MIME type: ${uncompressedMimeType}`,
          ),
        );
      }

      return Right({
        lineOriented: uncompressedRdfFormat.lineOriented,
        mimeType: mimeType as CompressionMethod,
        supportsQuads: uncompressedRdfFormat.supportsQuads,
        uncompressedMimeType: uncompressedRdfFormat.mimeType,
      } satisfies CompressedRdfFormat);
    }

    const uncompressedRdfFormat = (
      uncompressedRdfFormatsByMimeType as Record<string, UncompressedRdfFormat>
    )[mimeType];
    if (uncompressedRdfFormat === undefined) {
      return Left(
        new Error(`${filePath} has a non-RDF MIME type: ${mimeType}`),
      );
    }

    return Right(uncompressedRdfFormat);
  }

  export function isCompressed(
    rdfFormat: RdfFormat,
  ): rdfFormat is CompressedRdfFormat {
    return compressionMethods.some(
      (compressionMethod) => compressionMethod === rdfFormat.mimeType,
    );
  }
}
