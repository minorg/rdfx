import fs from "node:fs";
import * as path from "node:path";
import type { Readable } from "node:stream";
import zlib from "node:zlib";
import type { DatasetCore } from "@rdfjs/types";
import { Mime } from "mime";
import otherMimeTypes from "mime/types/other.js";
import standardMimeTypes from "mime/types/standard.js";
import {
  type Either,
  EitherAsync,
  Just,
  Left,
  type Maybe,
  Nothing,
  Right,
} from "purify-ts";
import type { Logger } from "ts-log";
import bz2 from "unbzip2-stream";
import { AbstractRdfFileSystemEntry } from "./AbstractRdfFileSystemEntry";

const mime = new Mime(standardMimeTypes, otherMimeTypes, {
  "application/x-brotli": ["br"],
});

export class RdfFile extends AbstractRdfFileSystemEntry {
  readonly format: RdfFile.Format;

  constructor({
    format,
    ...superParameters
  }: {
    format: RdfFile.Format;
  } & ConstructorParameters<typeof AbstractRdfFileSystemEntry>[0]) {
    super(superParameters);
    this.format = format;
  }

  static fromPath(
    filePath: string,
    options?: { logger?: Logger },
  ): Either<Error, RdfFile> {
    const mimeType = mime.getType(filePath);
    if (mimeType === null) {
      return Left(new Error(`unable to infer MIME type of ${filePath}`));
    }

    for (const compressionMethod of RdfFile.COMPRESSION_METHODS) {
      if (compressionMethod === mimeType) {
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
        for (const rdfFormat of RDF_FORMATS) {
          if (uncompressedMimeType === rdfFormat) {
            return Right(
              new RdfFile({
                format: {
                  compressionMethod: Just(compressionMethod),
                  rdfFormat,
                },
                logger: options?.logger,
                path: filePath,
              }),
            );
          }
        }
      }
    }

    for (const rdfFormat of RDF_FORMATS) {
      if (mimeType === rdfFormat) {
        return Right(
          new RdfFile({
            format: {
              compressionMethod: Nothing,
              rdfFormat,
            },
            logger: options?.logger,
            path: filePath,
          }),
        );
      }
    }

    return Left(new Error(`${filePath} has a non-RDF MIME type: ${mimeType}`));
  }

  async parse(options?: {
    dataset?: DatasetCore;
  }): Promise<Either<Error, DatasetCore>> {
    return EitherAsync(async () => {
      const dataset = options?.dataset ?? datasetFactory.dataset();

      this.logger.debug("parsing RDF file %s", this.path);
      let rdfFileStream: Readable = fs.createReadStream(this.path);

      if (this.format.compressionMethod.isJust()) {
        switch (this.format.compressionMethod.unsafeCoerce()) {
          case "application/gzip":
            rdfFileStream = rdfFileStream.pipe(zlib.createGunzip());
            break;
          case "application/x-brotli":
            rdfFileStream = rdfFileStream.pipe(zlib.createBrotliDecompress());
            break;
          case "application/x-bzip2":
            rdfFileStream = rdfFileStream.pipe(bz2());
            break;
        }
      }

      switch (this.format.rdfFormat) {
        case "application/ld+json":
          await new Promise<void>((resolve, reject) => {
            const streamParser = new JsonLdParser({ dataFactory });
            streamParser.on("data", (quad) => {
              dataset.add(quad);
            });
            streamParser.on("error", reject);
            streamParser.on("end", () => {
              resolve();
            });
            streamParser.on("error", reject);
            rdfFileStream.pipe(streamParser);
          });
          break;
        case "application/n-quads":
        case "application/n-triples":
        case "application/trig":
        case "text/turtle":
          {
            await new Promise<void>((resolve, reject) => {
              const streamParser = new N3StreamParser({
                factory: dataFactory,
                format: this.format.rdfFormat,
              });
              streamParser.on("data", (quad) => {
                dataset.add(quad);
              });
              streamParser.on("error", reject);
              streamParser.on("end", () => {
                resolve();
              });
              streamParser.on("error", reject);
              rdfFileStream.pipe(streamParser);
            });
          }
          break;
      }
      this.logger.debug(
        "parsed %d quads from RDF file %s",
        dataset.size,
        this.path,
      );
      return dataset;
    });
  }
}

export namespace RdfFile {
  export const COMPRESSION_METHODS = [
    "application/gzip",
    "application/x-brotli",
    "application/x-bzip2",
  ] as const;

  export type CompressionMethod = (typeof COMPRESSION_METHODS)[number];

  export interface Format {
    compressionMethod: Maybe<CompressionMethod>;
    rdfFormat: RdfFormat;
  }
}
