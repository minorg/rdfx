import type { Context } from "./Context.js";
import type { Level } from "./Level.js";

type RequiredKeys<T> = {
  // biome-ignore lint/complexity/noBannedTypes: voodoo
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type ContextArg<ContextT extends Context> =
  RequiredKeys<ContextT> extends never
    ? [context?: ContextT]
    : [context: ContextT];

export interface Logger<ContextT extends Context = Context> {
  child(context: ContextT): Logger<ContextT>;
  debug(message: string, ...context: ContextArg<ContextT>): void;
  error(message: string, ...context: ContextArg<ContextT>): void;
  info(message: string, ...context: ContextArg<ContextT>): void;
  isLevelEnabled(level: Level): boolean;
  trace(message: string, ...context: ContextArg<ContextT>): void;
  warn(message: string, ...context: ContextArg<ContextT>): void;
}
