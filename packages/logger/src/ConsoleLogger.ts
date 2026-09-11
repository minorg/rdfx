import type { Context } from "./Context.js";
import type { Level } from "./Level.js";
import type { LogFunction } from "./LogFunction.js";
import type { Logger } from "./Logger.js";

export const boundConsoleMethods: {
  [level in Level]: (...data: unknown[]) => void;
} = {
  debug: console.debug.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  trace: console.trace.bind(console),
  warn: console.warn.bind(console),
};

export const levelNumbers: { [level in Level]: number } = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export class ConsoleLogger<ContextT extends Context = Context>
  implements Logger<ContextT>
{
  constructor(
    readonly level: Level = "warn",
    readonly context: Context = {},
  ) {}

  child(context: Context): Logger {
    return new ConsoleLogger(this.level, { ...this.context, context });
  }

  debug: LogFunction<ContextT> = (
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ) => {
    return this.log(
      boundConsoleMethods.debug,
      "debug",
      contextOrMessage,
      messageOrArg,
      ...args,
    );
  };

  error: LogFunction<ContextT> = (
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ) => {
    return this.log(
      boundConsoleMethods.error,
      "error",
      contextOrMessage,
      messageOrArg,
      ...args,
    );
  };

  info: LogFunction<ContextT> = (
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ) => {
    return this.log(
      boundConsoleMethods.info,
      "info",
      contextOrMessage,
      messageOrArg,
      ...args,
    );
  };

  isLevelEnabled(level: Level): boolean {
    return levelNumbers[this.level] <= levelNumbers[level];
  }

  trace: LogFunction<ContextT> = (
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ) => {
    return this.log(
      boundConsoleMethods.trace,
      "trace",
      contextOrMessage,
      messageOrArg,
      ...args,
    );
  };

  warn: LogFunction<ContextT> = (
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ) => {
    return this.log(
      boundConsoleMethods.warn,
      "warn",
      contextOrMessage,
      messageOrArg,
      ...args,
    );
  };

  private log(
    consoleMethod: (...data: unknown[]) => void,
    level: Level,
    contextOrMessage: ContextT | string,
    messageOrArg?: string | unknown,
    ...args: unknown[]
  ): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const hasSecondArg = messageOrArg !== undefined || args.length > 0;
    const tailArgs = hasSecondArg ? [messageOrArg, ...args] : [];

    if (typeof contextOrMessage === "object" && contextOrMessage !== null) {
      const context: ContextT = contextOrMessage;
      const mergedContext = { ...this.context, ...context };
      if (Object.keys(mergedContext).length > 0) {
        consoleMethod(mergedContext, ...tailArgs);
      } else if (hasSecondArg) {
        consoleMethod(...tailArgs);
      }
    } else {
      const message: string = contextOrMessage;
      consoleMethod(message, ...tailArgs);
    }
  }
}
