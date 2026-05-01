import { type Either, EitherAsync } from "purify-ts";
import type { Logger } from "ts-log";
import { RdfDirectory } from "./RdfDirectory";
import { RdfFile } from "./RdfFile";
import { stat } from "./stat.js";

export type RdfFileSystemEntry = RdfDirectory | RdfFile;

export namespace RdfFileSystemEntry {
  export async function fromPath(
    path: string,
    options?: { logger: Logger },
  ): Promise<Either<Error, RdfFileSystemEntry>> {
    return EitherAsync(async ({ liftEither }) => {
      const stat_ = await liftEither(await stat(path));

      if (stat_.isDirectory())
        return new RdfDirectory({ logger: options?.logger, path });

      if (stat_.isFile()) {
        return await liftEither(
          RdfFile.fromPath(path, { logger: options?.logger }),
        );
      }

      throw new Error(`${path} is not a directory or a file`);
    });
  }
}
