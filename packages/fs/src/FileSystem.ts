import type { Readable, Writable } from "node:stream";
import type { Either } from "purify-ts";
import type { Dirent } from "./Dirent.js";
import type { ErrnoException } from "./ErrnoException.js";
import type { Stat } from "./Stat.js";

/**
 * Promise-based abstraction over node:fs.
 */
export interface FileSystem {
  createDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, void>>;

  createReadStream(path: string): Readable;
  createWriteStream(path: string): Writable;

  deleteDirectory(
    path: string,
    options?: { force?: boolean; recursive?: boolean },
  ): Promise<Either<ErrnoException, void>>;
  deleteFile(
    path: string,
    options?: { force?: boolean },
  ): Promise<Either<ErrnoException, void>>;

  readDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, readonly Dirent[]>>;
  readFile(path: string): Promise<Either<ErrnoException, Uint8Array>>;

  realpath(path: string): Promise<Either<ErrnoException, string>>;

  stat(path: string): Promise<Either<ErrnoException, Stat>>;

  writeFile(
    path: string,
    data: Uint8Array,
  ): Promise<Either<ErrnoException, void>>;
}
