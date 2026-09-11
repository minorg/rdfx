import type { Context } from "./Context.js";
import { Level } from "./Level.js";
import type { Logger } from "./Logger.js";

export class ConsoleLogger implements Logger {
  constructor(
    private readonly level: Level = "warn",
    private readonly context?: Context,
  ) {}

  child(context: Context): Logger {
    return new ConsoleLogger(this.level, this.mergeContext(context));
  }

  debug(message: string, context?: Context | undefined): void {
    if (this.isLevelEnabled("debug")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.debug(message, mergedContext);
      } else {
        console.debug(message);
      }
    }
  }

  error(message: string, context?: Context | undefined): void {
    if (this.isLevelEnabled("error")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.error(message, mergedContext);
      } else {
        console.error(message);
      }
    }
  }

  info(message: string, context?: Context | undefined): void {
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
    return Level.number[this.level] <= Level.number[level];
  }

  log(level: Level, message: string, context?: Context | undefined): void {
    switch (level) {
      case "debug":
        this.debug(message, context);
        break;
      case "error":
        this.error(message, context);
        break;
      case "info":
        this.info(message, context);
        break;
      case "trace":
        this.trace(message, context);
        break;
      case "warn":
        this.warn(message, context);
        break;
    }
  }

  trace(message: string, context?: Context | undefined): void {
    if (this.isLevelEnabled("trace")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.trace(message, mergedContext);
      } else {
        console.trace(message);
      }
    }
  }

  warn(message: string, context?: Context | undefined): void {
    if (this.isLevelEnabled("warn")) {
      const mergedContext = this.mergeContext(context);
      if (mergedContext) {
        console.warn(message, mergedContext);
      } else {
        console.warn(message);
      }
    }
  }

  private mergeContext(context: Context | undefined): Context | undefined {
    if (this.context === undefined && context === undefined) {
      return undefined;
    }
    return { ...this.context, ...context };
  }
}
