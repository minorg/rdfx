import * as fs from "node:fs";

import type { Readable, Writable } from "node:stream";
import { type Either, EitherAsync } from "purify-ts";

import type { Dirent } from "./Dirent.js";
import type { ErrnoException } from "./ErrnoException.js";
import type { FileSystem } from "./FileSystem.js";
import type { Stat } from "./Stat.js";

export class NodeFileSystem implements FileSystem {
  static instance: NodeFileSystem = new NodeFileSystem();

  protected constructor() {}

  async createDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(async () => {
      await fs.promises.mkdir(path, options);
    });
  }

  createReadStream(path: string): Readable {
    return fs.createReadStream(path) as Readable;
  }

  createWriteStream(path: string): Writable {
    return fs.createWriteStream(path);
  }

  async deleteDirectory(
    path: string,
    options?: { force?: boolean; recursive?: boolean },
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(() => fs.promises.rm(path, options));
  }

  async deleteFile(
    path: string,
    options?: { force?: boolean },
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(() => fs.promises.rm(path, options));
  }

  async readDirectory(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<Either<ErrnoException, readonly Dirent[]>> {
    return EitherAsync(() =>
      fs.promises.readdir(path, { ...options, withFileTypes: true }),
    );
  }

  async readFile(path: string): Promise<Either<ErrnoException, Uint8Array>> {
    return EitherAsync(() => fs.promises.readFile(path));
  }

  async realpath(path: string): Promise<Either<ErrnoException, string>> {
    return EitherAsync(() => fs.promises.realpath(path));
  }

  async stat(path: string): Promise<Either<ErrnoException, Stat>> {
    return EitherAsync(() => fs.promises.stat(path));
  }

  async writeFile(
    path: string,
    data: Uint8Array,
  ): Promise<Either<ErrnoException, void>> {
    return EitherAsync(() => fs.promises.writeFile(path, data));
  }
}
