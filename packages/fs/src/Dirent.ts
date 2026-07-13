export interface Dirent {
  readonly name: string;
  readonly parentPath: string;

  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}
