import { default as jestRdfMatchers } from "jest-rdf/lib/matchers/index.js";
import * as purifyMatchers from "./purifyMatchers.js";

export const matchers = {
  ...jestRdfMatchers,
  ...purifyMatchers,
};
