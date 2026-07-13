import path from "node:path";
import { Readable } from "node:stream";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import { type Either, EitherAsync } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";
import { RdfFile } from "./RdfFile.js";

/**
 * Abstraction for iterating over a directory of files with RDF data in them.
 */
export class RdfDirectory {
  private readonly fileSystem: FileSystem;
  private readonly logger: Logger;

  constructor(
    readonly path: string,
    options?: { fileSystem?: FileSystem; logger?: Logger },
  ) {
    this.fileSystem = options?.fileSystem ?? NodeFileSystem.instance;
    this.logger = options?.logger ?? dummyLogger;
  }

  async *files(options?: { recursive?: boolean }): AsyncGenerator<RdfFile> {
    const statEither = await this.fileSystem.stat(this.path);
    if (statEither.isLeft()) {
      this.logger.debug(
        "%s does not exist or is not accessible: %s",
        this.path,
        (statEither.extract() as Error).message,
      );
      return;
    }
    let stat_ = statEither.unsafeCoerce();
    let thisPath = this.path;
    if (stat_.isSymbolicLink()) {
      thisPath = (await this.fileSystem.realpath(this.path)).unsafeCoerce();
      stat_ = (await this.fileSystem.stat(thisPath)).unsafeCoerce();
    }

    if (!stat_.isDirectory()) {
      this.logger.warn("%s is not an (RDF) directory", this.path);
      return;
    }

    for (const dirent of (
      await this.fileSystem.readDirectory(this.path, options)
    ).unsafeCoerce()) {
      if (dirent.name.startsWith(".")) {
        continue;
      }
      let direntPath = path.resolve(dirent.parentPath, dirent.name);
      let direntIsFile: boolean;
      if (dirent.isSymbolicLink()) {
        direntPath = (
          await this.fileSystem.realpath(direntPath)
        ).unsafeCoerce();
        const stat = (await this.fileSystem.stat(direntPath)).unsafeCoerce();
        direntIsFile = stat.isFile();
      } else {
        direntIsFile = dirent.isFile();
      }

      if (direntIsFile) {
        const file = RdfFile.fromPath(direntPath, { logger: this.logger });
        if (file.isRight()) {
          yield file.extract();
        }
      }
    }
  }

  parse(options?: { recursive?: boolean }): Stream {
    const self = this;
    async function* parseFiles() {
      for await (const file of self.files(options)) {
        for await (const quad of file.parse() as unknown as AsyncIterable<Quad>) {
          yield quad;
        }
      }
    }

    return Readable.from(parseFiles(), {
      objectMode: true,
    }) as unknown as Stream;
  }

  async parseInto(
    dataset: DatasetCore,
    options?: { prefixMap?: PrefixMap; recursive?: boolean },
  ): Promise<Either<Error, DatasetCore>> {
    return EitherAsync(async ({ liftEither }) => {
      for await (const file of this.files(options)) {
        await liftEither(
          await file.parseInto(dataset, { prefixMap: options?.prefixMap }),
        );
      }
      return dataset;
    });
  }
}
