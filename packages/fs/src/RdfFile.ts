import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DatasetCore, NamedNode, Quad, Stream } from "@rdfjs/types";
import type serializers from "@rdfx/serializers";
import { Either, EitherAsync, Left } from "purify-ts";
import type { Logger } from "ts-log";
import { AbstractRdfFileSystemEntry } from "./AbstractRdfFileSystemEntry.js";
import type { FileSystem } from "./FileSystem.js";
import { parseRdfStream } from "./parseRdfStream.js";
import { RdfFormat } from "./RdfFormat.js";
import { serializeRdfStream } from "./serializeRdfStream.js";

export class RdfFile extends AbstractRdfFileSystemEntry {
  readonly format: RdfFormat;

  constructor(
    path: string,
    {
      format,
      ...superParameters
    }: {
      format: RdfFormat;
    } & ConstructorParameters<typeof AbstractRdfFileSystemEntry>[1],
  ) {
    super(path, superParameters);
    this.format = format;
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

  override parse(): Stream<Quad> {
    return parseRdfStream(
      this.format,
      this.fileSystem.createReadStream(this.path),
    );
  }

  override parseInto(
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
            serializeRdfStream({
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
