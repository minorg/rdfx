import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import type { Either } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";

export abstract class AbstractRdfFileSystemEntry {
  protected readonly fileSystem: FileSystem;
  protected readonly logger: Logger;

  constructor(
    readonly path: string,
    options?: { fileSystem?: FileSystem; logger?: Logger },
  ) {
    this.fileSystem = options?.fileSystem ?? NodeFileSystem.instance;
    this.logger = options?.logger ?? dummyLogger;
    this.path = path;
  }

  abstract parse(options?: { recursive?: boolean }): Stream<Quad>;

  abstract parseInto(
    dataset: DatasetCore,
    options?: { prefixMap?: PrefixMap; recursive?: boolean },
  ): Promise<Either<Error, DatasetCore>>;
}
