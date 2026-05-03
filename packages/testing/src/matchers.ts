import { default as jestRdfMatchers } from "jest-rdf/lib/matchers";
import * as purifyMatchers from "./purifyMatchers.js";

export const matchers = {
  ...jestRdfMatchers,
  ...purifyMatchers,
};
