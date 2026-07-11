import type { Readable, Writable } from "node:stream";
import type { Either } from "purify-ts";
import type { Dirent } from "./Dirent.js";
import type { ErrnoException } from "./ErrnoException.js";
import type { Stat } from "./Stat.js";

/**
 * Promise-based abstraction over node:fs.
 */
export interface FileSystem {
  /**
   * Create a directory (mkdir).
   *
   * @param path path to the new directory
   * @param recursive: create any parent directories as necessary
   */
  createDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, void>>;

  /**
   * Delete a directory.
   *
   * @param path path to the directory
   * @param force ignore ENOENT errors
   * @param recursive: recursively delete files and subdirectories in the directory
   */
  deleteDirectory(
    path: string,
    options?: { force?: boolean; recursive?: boolean },
  ): Promise<Either<ErrnoException, void>>;

  /**
   * Delete a file (unlink).
   *
   * @param path path to the file
   * @param force ignore ENOENT errors
   */
  deleteFile(
    path: string,
    options?: { force?: boolean },
  ): Promise<Either<ErrnoException, void>>;

  /**
   * Read/list entries in the directory.
   *
   * @param path path to the directory
   * @param recursive recursively iterate directory entries
   */
  readDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, readonly Dirent[]>>;

  /**
   * Read a file completely, returning its data as a byte array.
   *
   * @param path path to the file
   */
  readFile(path: string): Promise<Either<ErrnoException, Uint8Array>>;

  /**
   * Read a file with a stream.
   *
   * @param path path to the file
   */
  createReadStream(path: string): Readable;

  /**
   * Get the real path of a symbolic link.
   *
   * @param path path to the symbolic link
   */
  realpath(path: string): Promise<Either<ErrnoException, string>>;

  /**
   * Get metadata about a file or directory.
   *
   * @param path path to the file or directory
   */
  stat(path: string): Promise<Either<ErrnoException, Stat>>;

  /**
   * Overwrite a file.
   *
   * @param path path to the file.
   * @param data data to write
   */
  writeFile(
    path: string,
    data: Uint8Array,
  ): Promise<Either<ErrnoException, void>>;

  /**
   * Overwrite a file by borrowing and using a stream.
   *
   * @param path path to the file
   * @param write function that writes to the stream and only returns once writing is done
   */
  writeFileStream<ReturnT>(
    path: string,
    write: (stream: Writable) => Promise<Either<Error, ReturnT>>,
  ): Promise<Either<Error, ReturnT>>;
}
