import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import { type Either, EitherAsync } from "purify-ts";
import { AbstractRdfFileSystemEntry } from "./AbstractRdfFileSystemEntry.js";
import { RdfFile } from "./RdfFile.js";
import { stat } from "./stat.js";

/**
 * Abstraction for iterating over a directory of files with RDF data in them.
 */
export class RdfDirectory extends AbstractRdfFileSystemEntry {
  async *files(options?: { recursive?: boolean }): AsyncGenerator<RdfFile> {
    const logger = this.logger;
    const recursive = !!options?.recursive;

    async function* visitDirectory(
      directoryPath: string,
    ): AsyncGenerator<RdfFile> {
      for (const dirent of await fs.readdir(directoryPath, {
        withFileTypes: true,
      })) {
        if (dirent.name.startsWith(".")) {
          continue;
        }
        let direntPath = path.resolve(directoryPath, dirent.name);
        let direntIsDirectory: boolean;
        let direntIsFile: boolean;
        if (dirent.isSymbolicLink()) {
          direntPath = await fs.realpath(direntPath);
          const stat = await fs.stat(direntPath);
          direntIsDirectory = stat.isDirectory();
          direntIsFile = stat.isFile();
        } else {
          direntIsDirectory = dirent.isDirectory();
          direntIsFile = dirent.isFile();
        }
        if (direntIsDirectory && recursive) {
          yield* visitDirectory(direntPath);
        } else if (direntIsFile) {
          yield* visitFile(direntPath);
        } else {
          logger.warn("%s is not a directory or file", direntPath);
        }
      }
    }

    async function* visitFile(filePath: string): AsyncGenerator<RdfFile> {
      const file = RdfFile.fromPath(filePath, { logger });
      if (file.isRight()) {
        yield file.extract();
      }
    }

    const statEither = await stat(this.path);
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
      thisPath = await fs.realpath(this.path);
      stat_ = await fs.stat(thisPath);
    }

    if (stat_.isDirectory()) {
      yield* visitDirectory(thisPath);
    } else {
      this.logger.warn("%s is not an (RDF) directory", this.path);
    }
  }

  parse(options?: { recursive?: boolean }): Stream<Quad> {
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
    }) as unknown as Stream<Quad>;
  }

  override async parseInto(
    dataset: DatasetCore,
    options?: { recursive?: boolean },
  ): Promise<Either<Error, DatasetCore>> {
    return EitherAsync(async ({ liftEither }) => {
      for await (const file of this.files(options)) {
        await liftEither(await file.parseInto(dataset));
      }
      return dataset;
    });
  }
}
