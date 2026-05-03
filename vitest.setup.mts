import jestRdfMatchers from "jest-rdf/lib/matchers";
import type { Either } from "purify-ts";
import { expect } from "vitest";

expect.extend(jestRdfMatchers);

expect.extend({
  toBeLeft(received: Either<unknown, unknown>, expected?: unknown) {
    if (!received.isLeft()) {
      return {
        pass: false,
        message: () =>
          `expected a Left but received Right(${received.extract()})`,
      };
    }
    if (expected !== undefined) {
      const actual = received.extract();
      const pass = this.equals(actual, expected);
      return {
        pass,
        actual,
        expected,
        message: () => `expected Left(${actual}) to equal Left(${expected})`,
      };
    }
    return {
      pass: true,
      message: () => `expected not to be a Left`,
    };
  },
});
