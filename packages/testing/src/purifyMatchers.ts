import type { Either } from "purify-ts";
import type { Matcher, MatcherResult, MatcherState } from "vitest";

export function toBeLeft(
  context: MatcherState,
  received: Either<unknown, unknown>,
  expected?: unknown,
): MatcherResult {
  if (!received.isLeft()) {
    return {
      pass: false,
      message: () =>
        `expected a Left but received Right(${String(received.extract())})`,
    };
  }

  if (expected !== undefined) {
    const actual = received.extract();
    const pass = context.equals(actual, expected);
    return {
      pass,
      actual,
      expected,
      message: () =>
        pass
          ? `expected Left(${String(actual)}) not to equal Left(${String(expected)})`
          : `expected Left(${String(actual)}) to equal Left(${String(expected)})`,
    };
  }

  return {
    pass: true,
    message: () => `expected not to be a Left`,
  };
}

export const toBeLeftMatcher: Matcher = function (
  this: MatcherState,
  received: Either<unknown, unknown>,
  expected?: unknown,
): MatcherResult {
  return toBeLeft(this, received, expected);
};
