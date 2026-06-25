import type { Stream } from "@rdfjs/types";
import type { Either, Maybe } from "purify-ts";
import type { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * A GraphStore implementation that forwards to another GraphStore implementation.
 */
export class ForwardingGraphStore<
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
> implements
    GraphStore<
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
    >
{
  constructor(
    protected readonly delegate: GraphStore<
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
  ) {}

  async clear(options?: ClearOptionsT): Promise<Either<Error, ClearReturnT>> {
    return this.delegate.clear(options);
  }

  async delete(
    identifier: GraphIdentifier,
    options?: DeleteOptionsT,
  ): Promise<Either<Error, DeleteReturnT>> {
    return this.delegate.delete(identifier, options);
  }

  async get(
    identifier: GraphIdentifier,
    options?: GetOptionsT,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return this.delegate.get(identifier, options);
  }

  async head(
    identifier: GraphIdentifier,
    options?: HeadOptionsT,
  ): Promise<Either<Error, boolean>> {
    return this.delegate.head(identifier, options);
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return this.delegate.identifiers();
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return this.delegate.isEmpty();
  }

  async post(
    quads: Stream,
    options?: PostOptionsT,
  ): Promise<Either<Error, PostReturnT>> {
    return this.delegate.post(quads, options);
  }

  async put(
    quads: Stream,
    options?: PutOptionsT,
  ): Promise<Either<Error, PutReturnT>> {
    return this.delegate.put(quads, options);
  }
}
