import type { Context } from "./Context.js";
import type { Level } from "./Level.js";
import type { LogFunction } from "./LogFunction.js";

export interface Logger<ContextT extends Context = Context> {
  child(context: ContextT): Logger<ContextT>;
  debug: LogFunction<ContextT>;
  error: LogFunction<ContextT>;
  info: LogFunction<ContextT>;
  isLevelEnabled(level: Level): boolean;
  trace: LogFunction<ContextT>;
  warn: LogFunction<ContextT>;
}
