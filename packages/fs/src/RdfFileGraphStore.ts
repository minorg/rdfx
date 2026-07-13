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
import { Memoize } from "typescript-memoize";

import { isErrnoException } from "./ErrnoException.js";
import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";
import { RdfFile } from "./RdfFile.js";
import { RdfFormat } from "./RdfFormat.js";

/**
 * A GraphStore implementation backed by a single RdfFile.
 */
export class RdfFileGraphStore implements GraphStore {
  private readonly fileSystem: FileSystem;
  private readonly logger: Logger;
  private readonly prefixMap?: PrefixMap;

  readonly format: RdfFormat;

  constructor(
    readonly path: string,
    options?: {
      fileSystem?: FileSystem;
      format?: RdfFormat;
      logger?: Logger;
      prefixMap?: PrefixMap;
    },
  ) {
    this.fileSystem = options?.fileSystem ?? NodeFileSystem.instance;
    this.format = options?.format ?? RdfFormat.fromPath(path).unsafeCoerce();
    this.logger = options?.logger ?? dummyLogger;
    this.prefixMap = options?.prefixMap;
  }

  @Memoize()
  private get rdfFile(): RdfFile {
    return new RdfFile(this.path, {
      format: this.format,
      logger: this.logger,
    });
  }

  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(
        await this.fileSystem.deleteFile(this.path, { force: true }),
      );
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

  async unionDataset(): Promise<Either<Error, DatasetCore>> {
    return (
      await EitherAsync<Error, DatasetCore>(async ({ liftEither }) => {
        this.logger.debug("parsing dataset from %s", this.path);
        const dataset = await liftEither(
          await this.rdfFile.parseInto(datasetFactory.dataset()),
        );
        this.logger.debug("parsed %d quads from %d", dataset.size, this.path);
        return dataset;
      })
    ).chainLeft((error) => {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return Either.of(datasetFactory.dataset());
      } else {
        return Left(error);
      }
    });
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
        await liftEither(
          await this.fileSystem.deleteFile(this.path, { force: true }),
        );
        return return_;
      }

      await liftEither(
        await this.rdfFile.serialize(intoStream.object(unionDataset), {
          prefixes: this.prefixMap,
        }),
      );

      return return_;
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
