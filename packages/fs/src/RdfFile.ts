import type { DatasetCore, NamedNode, Stream } from "@rdfjs/types";
import type { PrefixMap } from "@rdfx/collection";
import type serializers from "@rdfx/serializers";
import { Either, EitherAsync, Left } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import { CompressedRdfStream } from "./CompressedRdfStream.js";
import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";
import { RdfFormat } from "./RdfFormat.js";
import { uncompressedRdfFormatsByMimeType } from "./uncompressedRdfFormatsByMimeType.js";

export class RdfFile {
  readonly format: RdfFormat;
  private readonly fileSystem: FileSystem;
  private readonly logger: Logger;

  constructor(
    readonly path: string,
    options?: {
      fileSystem?: FileSystem;
      format?: RdfFormat;
      logger?: Logger;
    },
  ) {
    this.fileSystem = options?.fileSystem ?? NodeFileSystem.instance;
    this.format =
      options?.format ??
      uncompressedRdfFormatsByMimeType["application/n-quads"];
    this.logger = options?.logger ?? dummyLogger;
  }

  static fromPath(
    filePath: string,
    options?: { fileSystem?: FileSystem; logger?: Logger },
  ): Either<Error, RdfFile> {
    return RdfFormat.fromPath(filePath).map(
      (format) =>
        new RdfFile(filePath, {
          fileSystem: options?.fileSystem,
          format,
          logger: options?.logger,
        }),
    );
  }

  parse(): Stream {
    return CompressedRdfStream.parse(
      this.format,
      this.fileSystem.createReadStream(this.path),
    );
  }

  parseInto(
    dataset: DatasetCore,
    options?: { prefixMap?: PrefixMap },
  ): Promise<Either<Error, DatasetCore>> {
    return new Promise<Either<Error, DatasetCore>>((resolve) => {
      const stream = this.parse();
      stream.on("data", (quad) => dataset.add(quad));
      stream.on("prefix", (prefix: string, prefixNode: NamedNode) => {
        const prefixMap = options?.prefixMap;
        if (!prefixMap) {
          return;
        }

        for (const [
          existingPrefix,
          existingPrefixNode,
        ] of prefixMap.entries()) {
          if (existingPrefix === prefix) {
            if (!prefixNode.equals(existingPrefixNode)) {
              this.logger.warn(
                "conflicting prefix %s: %s vs. %s",
                prefixNode.value,
                existingPrefixNode.value,
              );
              return;
            }
          } else if (prefixNode.equals(existingPrefixNode)) {
            this.logger.debug(
              "duplicate prefix %s: %s vs. %s",
              prefixNode.value,
              prefix,
              existingPrefix,
            );
          }
        }

        prefixMap.set(prefix, prefixNode);
      });
      stream.on("end", () => resolve(Either.of(dataset)));
      stream.on("error", (error) => resolve(Left(error)));
    });
  }

  async serialize(
    quads: Stream,
    options?: Parameters<typeof serializers>[0],
  ): Promise<Either<Error, void>> {
    return EitherAsync(
      async ({ liftEither }) =>
        await liftEither(
          await this.fileSystem.writeFileStream(this.path, (fileStream) =>
            CompressedRdfStream.serialize({
              format: this.format,
              source: quads,
              destination: fileStream,
              serializerOptions: options,
            }),
          ),
        ),
    );
  }
}

export namespace RdfFile {}
