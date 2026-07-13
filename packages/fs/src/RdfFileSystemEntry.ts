import { type Either, EitherAsync } from "purify-ts";
import type { Logger } from "ts-log";
import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";
import { RdfDirectory } from "./RdfDirectory.js";
import { RdfFile } from "./RdfFile.js";

export type RdfFileSystemEntry = RdfDirectory | RdfFile;

export namespace RdfFileSystemEntry {
  export async function fromPath(
    path: string,
    options?: { fileSystem?: FileSystem; logger?: Logger },
  ): Promise<Either<Error, RdfFileSystemEntry>> {
    const fileSystem: FileSystem =
      options?.fileSystem ?? NodeFileSystem.instance;

    return EitherAsync(async ({ liftEither }) => {
      const stat_ = await liftEither(await fileSystem.stat(path));

      if (stat_.isDirectory())
        return new RdfDirectory(path, { logger: options?.logger });

      if (stat_.isFile()) {
        return await liftEither(
          RdfFile.fromPath(path, { logger: options?.logger }),
        );
      }

      throw new Error(`${path} is not a directory or a file`);
    });
  }
}
