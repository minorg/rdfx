export interface Stat {
  readonly atime: Date;
  readonly ctime: Date;
  readonly mtime: Date;

  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}
