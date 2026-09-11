import type { Context } from "./Context.js";
import type { Level } from "./Level.js";

export interface Logger<ContextT extends Context = Context> {
  child(context: ContextT): Logger<ContextT>;
  debug(context: ContextT, message: string): void;
  error(context: ContextT, message: string): void;
  info(context: ContextT, message: string): void;
  isLevelEnabled(level: Level): boolean;
  trace(context: ContextT, message: string): void;
  warn(context: ContextT, message: string): void;
}
