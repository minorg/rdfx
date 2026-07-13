export interface ErrnoException extends Error {
  code?: string;
  errno?: number;
  path?: string;
  syscall?: string;
}

export function isErrnoException(error: unknown): error is ErrnoException {
  return error instanceof Error && ("code" in error || "errno" in error);
}
