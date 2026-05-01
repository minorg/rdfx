import fs from "node:fs/promises";
import path from "node:path";
import { fsEither } from "@exlektix/fs";
import { type DatasetCore, datasetFactory } from "@exlektix/rdf";
import { type Either, EitherAsync } from "purify-ts";
import { AbstractRdfFileSystemEntry } from "./AbstractRdfFileSystemEntry";
import { RdfFile } from "./RdfFile";

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

    const statEither = await fsEither.stat(this.path);
    if (statEither.isLeft()) {
      this.logger.debug(
        "%s does not exist or is not accessible: %s",
        this.path,
        (statEither.extract() as Error).message,
      );
      return;
    }
    let stat = statEither.unsafeCoerce();
    let thisPath = this.path;
    if (stat.isSymbolicLink()) {
      thisPath = await fs.realpath(this.path);
      stat = await fs.stat(thisPath);
    }

    if (stat.isDirectory()) {
      yield* visitDirectory(thisPath);
    } else {
      this.logger.warn("%s is not an (RDF) directory", this.path);
    }
  }

  async parse(options?: {
    dataset?: DatasetCore;
    recursive?: boolean;
  }): Promise<Either<Error, DatasetCore>> {
    return EitherAsync(async ({ liftEither }) => {
      const dataset = options?.dataset ?? datasetFactory.dataset();
      for await (const file of this.files({ recursive: options?.recursive })) {
        await liftEither(await file.parse({ dataset }));
      }
      return dataset;
    });
  }
}
