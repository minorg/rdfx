import type { Stream } from "@rdfjs/types";
import type { Either, Maybe } from "purify-ts";
import type { Logger } from "ts-log";
import type { GraphIdentifier } from "./GraphIdentifier.js";
import type { GraphStore } from "./GraphStore.js";

/**
 * Wrap a GraphStore implementation and log its operations.
 */
export class LoggingGraphStore<
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
    private readonly delegate: GraphStore<
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
    private readonly logger: Logger,
  ) {}

  async clear(options?: ClearOptionsT): Promise<Either<Error, ClearReturnT>> {
    this.logger.debug("clear(options=%s)", options);
    return this.delegate.clear(options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "clear(options=%s) -> ERROR: %s",
            options,
            error.message,
          );
        })
        .ifRight((return_) => {
          this.logger.debug(
            "clear(options=%s) -> SUCCESS: %s",
            options,
            return_,
          );
        }),
    );
  }

  async delete(
    identifier: GraphIdentifier,
    options?: DeleteOptionsT,
  ): Promise<Either<Error, DeleteReturnT>> {
    this.logger.debug("delete(identifier=%s, options=%s)", identifier, options);
    return this.delegate.delete(identifier, options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "delete(identifier=%s, options=%s) -> ERROR: %s",
            identifier,
            options,
            error.message,
          );
        })
        .ifRight((return_) => {
          this.logger.debug(
            "delete(identifier=%s, options=%s) -> SUCCESS: %s",
            identifier,
            options,
            return_,
          );
        }),
    );
  }

  async get(
    identifier: GraphIdentifier,
    options?: GetOptionsT,
  ): Promise<Either<Error, Maybe<Stream>>> {
    this.logger.debug("get(identifier=%s, options=%s)", identifier, options);
    return this.delegate.get(identifier, options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "get(identifier=%s, options=%s) -> ERROR: %s",
            identifier,
            options,
            error.message,
          );
        })
        .ifRight((maybeStream) => {
          this.logger.debug(
            "get(identifier=%s, options=%s) -> SUCCESS: %s",
            identifier,
            options,
            maybeStream.isJust() ? "<stream>" : "<nothing>",
          );
        }),
    );
  }

  async head(
    identifier: GraphIdentifier,
    options?: HeadOptionsT,
  ): Promise<Either<Error, boolean>> {
    this.logger.debug("head(identifier=%s, options=%s)", identifier, options);
    return this.delegate.head(identifier, options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "head(identifier=%s, options=%s) -> ERROR: %s",
            identifier,
            options,
            error.message,
          );
        })
        .ifRight((return_) => {
          this.logger.debug(
            "head(identifier=%s, options=%s) -> SUCCESS: %s",
            identifier,
            options,
            return_,
          );
        }),
    );
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    this.logger.debug("identifiers()");
    return this.delegate.identifiers().then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error("identifiers() -> ERROR: %s", error.message);
        })
        .ifRight((return_) => {
          this.logger.debug("identifiers() -> SUCCESS: %s", return_);
        }),
    );
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    this.logger.debug("isEmpty()");
    return this.delegate.isEmpty().then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error("isEmpty() -> ERROR: %s", error.message);
        })
        .ifRight((return_) => {
          this.logger.debug("isEmpty() -> SUCCESS: %s", return_);
        }),
    );
  }

  async post(
    quads: Stream,
    options?: PostOptionsT,
  ): Promise<Either<Error, PostReturnT>> {
    this.logger.debug("post(quads, options=%s)", options);
    return this.delegate.post(quads, options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "post(quads, options=%s) -> ERROR: %s",
            options,
            error.message,
          );
        })
        .ifRight((return_) => {
          this.logger.debug(
            "post(quads, options=%s) -> SUCCESS: %s",
            options,
            return_,
          );
        }),
    );
  }

  async put(
    quads: Stream,
    options?: PutOptionsT,
  ): Promise<Either<Error, PutReturnT>> {
    this.logger.debug("put(quads, options=%s)", options);
    return this.delegate.put(quads, options).then((either) =>
      either
        .ifLeft((error) => {
          this.logger.error(
            "put(quads, options=%s) -> ERROR: %s",
            options,
            error.message,
          );
        })
        .ifRight((return_) => {
          this.logger.debug(
            "put(quads, options=%s) -> SUCCESS: %s",
            options,
            return_,
          );
        }),
    );
  }
}
