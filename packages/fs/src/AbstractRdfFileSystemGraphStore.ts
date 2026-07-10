import fs from "node:fs";
import type { Readable } from "node:stream";
import datasetFactory from "@rdfjs/dataset";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { GraphIdentifier } from "@rdfx/graph-store";
import { Either, EitherAsync, Left, Maybe } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";

import { RdfFile } from "./RdfFile.js";

export abstract class AbstractRdfFileSystemGraphStore {
  private readonly prefixMap?: PrefixMap;

  protected readonly logger: Logger;
  protected readonly rdfFileFormat: RdfFile.Format;

  constructor(
    readonly path: string,
    options?: {
      logger?: Logger;
      prefixMap?: PrefixMap;
      rdfFileFormat?: RdfFile.Format;
    },
  ) {
    this.logger = options?.logger ?? dummyLogger;
    this.path = path;
    if (options?.rdfFileFormat) {
      this.rdfFileFormat = options.rdfFileFormat;
    } else {
      this.rdfFileFormat = RdfFile.fromPath(this.path)
        .map((_) => _.format)
        .orDefault({
          compressionMethod: Maybe.empty(),
          rdfFormat: "application/n-quads",
        });
    }
    this.prefixMap = options?.prefixMap;
  }

  protected async createDirectory(
    directoryPath: string,
    options?: fs.MakeDirectoryOptions & { recursive?: boolean },
  ): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      await fs.promises.mkdir(directoryPath, options);
    });
  }

  protected async deleteDirectory(
    directoryPath: string,
    options?: fs.RmOptions,
  ): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      await fs.promises.rm(directoryPath, options);
    });
  }

  protected async deleteFile(
    filePath: string,
    options?: { force?: boolean },
  ): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      await fs.promises.rm(filePath, options);
    });
  }

  protected errorCode(error: unknown): string | undefined {
    return error instanceof Error && "code" in error
      ? (error.code as string)
      : undefined;
  }

  protected async readFileDataset(
    filePath: string,
  ): Promise<Either<Error, DatasetCore>> {
    return (
      await EitherAsync<Error, DatasetCore>(async ({ liftEither }) => {
        this.logger.debug("parsing dataset from %s", this.path);
        const dataset = await liftEither(
          await this.file(filePath).parseInto(datasetFactory.dataset()),
        );
        this.logger.debug("parsed %d quads from %d", dataset.size, this.path);
        return dataset;
      })
    ).chainLeft((error) => {
      if (this.errorCode(error) === "ENOENT") {
        return Either.of(datasetFactory.dataset());
      } else {
        return Left(error);
      }
    });
  }

  protected async readFileLines(
    filePath: string,
  ): Promise<Either<Error, readonly string[]>> {
    return EitherAsync(async () => {
      try {
        return (await fs.promises.readFile(filePath))
          .toString("utf-8")
          .split("\n");
      } catch (error) {
        if (this.errorCode(error) === "ENOENT") {
          return [];
        }
        throw error;
      }
    });
  }

  protected readFileStream(
    filePath: string,
    options?: { overrideGraph?: GraphIdentifier },
  ): Stream {
    const file = this.file(filePath);

    if (!options?.overrideGraph) {
      return file.parse();
    }

    return (file.parse() as Readable).map((quad: Quad) =>
      dataFactory.quad(
        quad.subject,
        quad.predicate,
        quad.object,
        options.overrideGraph,
      ),
    );
  }

  protected async writeFileLines(
    filePath: string,
    lines: readonly string[],
  ): Promise<Either<Error, void>> {
    return EitherAsync(async () => {
      await fs.promises.writeFile(filePath, lines.join("\n"), "utf-8");
    });
  }

  protected async writeFileQuads(
    filePath: string,
    quads: Stream<Quad>,
  ): Promise<Either<Error, void>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(
        await this.file(filePath).serialize(quads, {
          prefixes: this.prefixMap,
        }),
      );
    });
  }

  private file(path: string): RdfFile {
    return new RdfFile(path, {
      format: this.rdfFileFormat,
      logger: this.logger,
    });
  }
}
