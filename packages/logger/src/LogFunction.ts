import type { Context } from "./Context.js";

// Adapted from pino, MIT license
export interface LogFunction<ContextT extends Context> {
  // Simple case: When first argument is always a string message, use parsed arguments directly
  <MessageT extends string = string>(
    message: MessageT,
    ...args: ParseLogFunctionArgs<MessageT>
  ): void;
  // Complex case: When first argument can be any type - if it's a string, no message needed; otherwise require a message
  <T, MessageT extends string = string>(
    obj: [T] extends [object] ? T & ContextT : T,
    message?: T extends string ? never : MessageT,
    ...args: ParseLogFunctionArgs<MessageT> | []
  ): void;
  // Complex case with type safety: Same as above but ensures ParseLogFunctionArgs is a valid tuple before using it
  <T, MessageT extends string = string>(
    obj: [T] extends [object] ? T & ContextT : T,
    message?: T extends string ? never : MessageT,
    ...args: ParseLogFunctionArgs<MessageT> extends [unknown, ...unknown[]]
      ? ParseLogFunctionArgs<MessageT>
      : unknown[]
  ): void;
}

type ParseLogFunctionArgs<
  T,
  Acc extends unknown[] = [],
> = T extends `${infer _}%${infer Placeholder}${infer Rest}`
  ? Placeholder extends PlaceholderSpecifier
    ? ParseLogFunctionArgs<Rest, [...Acc, PlaceholderTypeMapping<Placeholder>]>
    : ParseLogFunctionArgs<Rest, Acc>
  : Acc;

type PlaceholderSpecifier = "d" | "s" | "j" | "o" | "O";
type PlaceholderTypeMapping<T extends PlaceholderSpecifier> = T extends "d"
  ? number
  : T extends "s"
    ? unknown
    : T extends "j" | "o" | "O"
      ? // biome-ignore lint/complexity/noBannedTypes: Don't change pino code that works
        {} | null
      : never;
