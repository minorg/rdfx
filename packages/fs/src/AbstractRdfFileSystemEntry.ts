import type { DatasetCore } from "@rdfjs/types";
import type { Either } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";

export abstract class AbstractRdfFileSystemEntry {
  protected readonly logger: Logger;
  readonly path: string;

  constructor({ logger, path }: { logger?: Logger; path: string }) {
    this.logger = logger ?? dummyLogger;
    this.path = path;
  }

  abstract parse(options?: {
    dataset?: DatasetCore;
    recursive?: boolean;
  }): Promise<Either<Error, DatasetCore>>;
}
