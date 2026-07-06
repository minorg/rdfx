import type { Stream } from "@rdfjs/types";
import { type Either, EitherAsync, Maybe } from "purify-ts";
import type { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * A GraphStore implementation that multiplexes over multiple other GraphStore implementations.
 */
export class MultiplexingGraphStore<
  ClearOptionsT extends object,
  ClearReturnT extends object,
  DeleteOptionsT extends object,
  DeleteReturnT extends object,
  GetOptionsT extends object,
  HeadOptionsT extends object,
  PostOptionsT extends object,
  PostReturnT extends object,
  PutOptionsT extends object,
  PutReturnT extends object,
> implements GraphStore
{
  private readonly graphStores: readonly GraphStore<
    ClearOptionsT,
    ClearReturnT,
    DeleteOptionsT,
    DeleteReturnT,
    GetOptionsT,
    HeadOptionsT,
    PostOptionsT,
    PostReturnT,
    PutOptionsT,
    PutReturnT
  >[];

  constructor(
    private readonly readWriteGraphStore: GraphStore<
      ClearOptionsT,
      ClearReturnT,
      DeleteOptionsT,
      DeleteReturnT,
      GetOptionsT,
      HeadOptionsT,
      PostOptionsT,
      PostReturnT,
      PutOptionsT,
      PutReturnT
    >,
    ...readOnlyGraphStores: readonly GraphStore<
      ClearOptionsT,
      ClearReturnT,
      DeleteOptionsT,
      DeleteReturnT,
      GetOptionsT,
      HeadOptionsT,
      PostOptionsT,
      PostReturnT,
      PutOptionsT,
      PutReturnT
    >[]
  ) {
    this.graphStores = [readWriteGraphStore, ...readOnlyGraphStores];
  }

  clear(options?: ClearOptionsT): Promise<Either<Error, ClearReturnT>> {
    return this.readWriteGraphStore.clear(options);
  }

  delete(
    identifier: GraphIdentifier,
    options?: DeleteOptionsT,
  ): Promise<Either<Error, DeleteReturnT>> {
    return this.readWriteGraphStore.delete(identifier, options);
  }

  async get(
    identifier: GraphIdentifier,
    options?: GetOptionsT,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return EitherAsync(async ({ liftEither }) => {
      for (const graphStore of this.graphStores) {
        const quads = await liftEither(
          await graphStore.get(identifier, options),
        );
        if (quads.isJust()) {
          return quads;
        }
      }
      return Maybe.empty();
    });
  }

  async head(
    identifier: GraphIdentifier,
    options?: HeadOptionsT,
  ): Promise<Either<Error, boolean>> {
    return EitherAsync(async ({ liftEither }) => {
      for (const graphStore of this.graphStores) {
        const result = await liftEither(
          await graphStore.head(identifier, options),
        );
        if (result) {
          return result;
        }
      }
      return false;
    });
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return EitherAsync(async ({ liftEither }) => {
      const identifiers = new Map<string, GraphIdentifier>();
      for (const graphStore of this.graphStores) {
        for (const identifier of await liftEither(
          await graphStore.identifiers(),
        )) {
          identifiers.set(identifier.value, identifier);
        }
      }
      return [...identifiers.values()];
    });
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return EitherAsync(async ({ liftEither }) => {
      for (const graphStore of this.graphStores) {
        if (!(await liftEither(await graphStore.isEmpty()))) {
          return false;
        }
      }
      return true;
    });
  }

  post(
    quads: Stream,
    options?: PostOptionsT,
  ): Promise<Either<Error, PostReturnT>> {
    return this.readWriteGraphStore.post(quads, options);
  }

  put(
    quads: Stream,
    options?: PutOptionsT,
  ): Promise<Either<Error, PutReturnT>> {
    return this.readWriteGraphStore.put(quads, options);
  }
}
