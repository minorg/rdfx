import type { Context } from "./Context.js";
import type { Level } from "./Level.js";
import type { Logger } from "./Logger.js";

export const levelNumbers: { [level in Level]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export class ConsoleLogger implements Logger {
  constructor(
    readonly level: Level = "warn",
    readonly context: Context = {},
  ) {}

  child(context: Context): Logger {
    return new ConsoleLogger(this.level, { ...this.context, context });
  }

  debug(context: Context, message: string): void {
    if (this.isLevelEnabled("debug")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.debug(message, mergedContext);
      } else {
        console.debug(message);
      }
    }
  }

  error(context: Context, message: string): void {
    if (this.isLevelEnabled("error")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.error(message, mergedContext);
      } else {
        console.error(message);
      }
    }
  }

  info(context: Context, message: string): void {
    if (this.isLevelEnabled("info")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.info(message, mergedContext);
      } else {
        console.info(message);
      }
    }
  }

  isLevelEnabled(level: Level): boolean {
    return levelNumbers[this.level] <= levelNumbers[level];
  }

  trace(context: Context, message: string): void {
    if (this.isLevelEnabled("trace")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.trace(message, mergedContext);
      } else {
        console.trace(message);
      }
    }
  }

  warn(context: Context, message: string): void {
    if (this.isLevelEnabled("warn")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.warn(message, mergedContext);
      } else {
        console.warn(message);
      }
    }
  }

  private mergeContext(context: Context): Context | undefined {
    const mergedContext = { ...this.context, ...context };
    if (Object.keys(mergedContext).length === 0) {
      return undefined;
    }
    return mergedContext;
  }
}
