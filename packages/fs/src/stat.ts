import * as fs from "node:fs";
import { type Either, Left, Right } from "purify-ts";

export async function stat(
  path: fs.PathLike,
): Promise<Either<Error, fs.Stats>> {
  try {
    return Right(await fs.promises.stat(path));
  } catch (e) {
    return Left(e as Error);
  }
}
