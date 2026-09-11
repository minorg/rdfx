export {};

declare global {
  interface CustomConsole {
    debug(...data: unknown[]): void;
    error(...data: unknown[]): void;
    info(...data: unknown[]): void;
    log(...data: unknown[]): void;
    trace(...data: unknown[]): void;
    warn(...data: unknown[]): void;
  }

  const console: CustomConsole;
}