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
  function basename(filePath: string): string {
    const lastSlashIndex = Math.max(
      filePath.lastIndexOf("/"),
      filePath.lastIndexOf("\\"),
    );
    return lastSlashIndex === -1
      ? filePath
      : filePath.slice(lastSlashIndex + 1);
  }

  function removeExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf(".");
    // lastDotIndex <= 0 covers "no extension" and dotfiles like ".gitignore"
    return lastDotIndex <= 0 ? fileName : fileName.slice(0, lastDotIndex);
  }

  export function fromFileName(fileName: string): Either<Error, RdfFormat> {
    const mimeType = mime.getType(fileName);
    if (mimeType === null) {
      return Left(new Error(`unable to infer MIME type of ${fileName}`));
    }

    if (compressionMethodsSet.has(mimeType)) {
      const uncompressedFileName = removeExtension(basename(fileName));

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
            `${fileName} has a non-RDF MIME type: ${uncompressedMimeType}`,
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
        new Error(`${fileName} has a non-RDF MIME type: ${mimeType}`),
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
