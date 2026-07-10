import path from "node:path";
import type { DatasetCore, Stream } from "@rdfjs/types";
import {
  type GraphIdentifier,
  type GraphStore,
  RdfjsDatasetGraphStore,
} from "@rdfx/graph-store";
import intoStream from "into-stream";
import { type Either, EitherAsync, type Maybe } from "purify-ts";
import { AbstractRdfFileSystemGraphStore } from "./AbstractRdfFileSystemGraphStore.js";

/**
 * A GraphStore implementation backed by a single RdfFile.
 */
export class RdfFileGraphStore
  extends AbstractRdfFileSystemGraphStore
  implements GraphStore
{
  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(await this.deleteFile(this.path, { force: true }));
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
    return this.readFileDataset(this.path);
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
        await liftEither(await this.deleteFile(this.path));
        return return_;
      }

      await liftEither(
        await this.createDirectory(path.dirname(this.path), {
          recursive: true,
        }),
      );

      await liftEither(
        await this.writeFileQuads(this.path, intoStream.object(unionDataset)),
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
