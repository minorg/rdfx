export type Level = "debug" | "error" | "info" | "trace" | "warn";

export namespace Level {
  export const number: { [level in Level]: number } = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };
}
