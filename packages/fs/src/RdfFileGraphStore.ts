import fs from "node:fs/promises";
import path from "node:path";
import datasetFactory from "@rdfjs/dataset";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DatasetCore, Stream } from "@rdfjs/types";
import {
  type GraphIdentifier,
  type GraphStore,
  RdfjsDatasetGraphStore,
} from "@rdfx/graph-store";
import intoStream from "into-stream";
import { Either, EitherAsync, Left, type Maybe } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import { RdfFile } from "./RdfFile.js";

/**
 * A GraphStore implementation backed by a single RdfFile.
 */
export class RdfFileGraphStore implements GraphStore {
  private readonly file: RdfFile;
  private readonly logger: Logger;
  private readonly prefixMap?: PrefixMap;

  constructor(
    readonly filePath: string,
    options?: {
      format?: RdfFile.Format;
      logger?: Logger;
      prefixMap?: PrefixMap;
    },
  ) {
    this.logger = options?.logger ?? dummyLogger;
    this.file = options?.format
      ? new RdfFile(this.filePath, { format: options.format })
      : RdfFile.fromPath(this.filePath, {
          logger: this.logger,
        }).unsafeCoerce();
    this.prefixMap = options?.prefixMap;
  }

  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async () => {
      try {
        await fs.unlink(this.filePath);
      } catch (error) {
        if (errorCode(error) !== "ENOENT") {
          throw error;
        }
      }
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return this.mutate((unionDatasetGraphStore) =>
      unionDatasetGraphStore.delete(identifier),
    );
  }

  async get(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return EitherAsync(
      async ({ liftEither }) =>
        await liftEither(
          await (await liftEither(await this.unionDatasetGraphStore())).get(
            identifier,
          ),
        ),
    );
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return EitherAsync(
      async ({ liftEither }) =>
        await liftEither(
          await (
            await liftEither(await this.unionDatasetGraphStore())
          ).identifiers(),
        ),
    );
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return EitherAsync(
      async ({ liftEither }) =>
        await liftEither(
          await (await liftEither(await this.unionDatasetGraphStore())).head(
            identifier,
          ),
        ),
    );
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return EitherAsync(
      async ({ liftEither }) =>
        await liftEither(
          await (
            await liftEither(await this.unionDatasetGraphStore())
          ).isEmpty(),
        ),
    );
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return this.mutate((unionDatasetGraphStore) =>
      unionDatasetGraphStore.post(quads),
    );
  }

  async put(quads: Stream): Promise<Either<Error, object>> {
    return this.mutate((unionDatasetGraphStore) =>
      unionDatasetGraphStore.put(quads),
    );
  }

  private async mutate<ReturnT>(
    mutator: (
      unionDatasetGraphStore: RdfjsDatasetGraphStore,
    ) => Promise<Either<Error, ReturnT>>,
  ): Promise<Either<Error, ReturnT>> {
    return EitherAsync(async ({ liftEither }) => {
      const unionDataset = await liftEither(await this.unionDataset());

      const return_ = await liftEither(
        await mutator(new RdfjsDatasetGraphStore(unionDataset)),
      );

      if (unionDataset.size === 0) {
        try {
          await fs.unlink(this.filePath);
        } catch (error) {
          if (errorCode(error) !== "ENOENT") {
            throw error;
          }
        }
        return return_;
      }

      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      await liftEither(
        await this.file.serialize(intoStream.object(unionDataset), {
          prefixes: this.prefixMap,
        }),
      );

      return return_;
    });
  }

  private async unionDataset(): Promise<Either<Error, DatasetCore>> {
    return (
      await EitherAsync<Error, DatasetCore>(async ({ liftEither }) => {
        this.logger.debug("parsing dataset from %s", this.filePath);
        const dataset = await liftEither(
          await this.file.parseInto(datasetFactory.dataset()),
        );
        this.logger.debug(
          "parsed %d quads from %d",
          dataset.size,
          this.filePath,
        );
        return dataset;
      })
    ).chainLeft((error) => {
      if (errorCode(error) === "ENOENT") {
        return Either.of(datasetFactory.dataset());
      } else {
        return Left(error);
      }
    });
  }

  private async unionDatasetGraphStore(): Promise<
    Either<Error, RdfjsDatasetGraphStore>
  > {
    return (await this.unionDataset()).map(
      (dataset) => new RdfjsDatasetGraphStore(dataset),
    );
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? (error.code as string)
    : undefined;
}
