import {
  toBeRdfDatasetContaining,
  toBeRdfDatasetMatching,
  toBeRdfDatasetOfSize,
  toBeRdfIsomorphic,
  toEqualRdfQuad,
  toEqualRdfQuadArray,
  toEqualRdfTerm,
  toEqualRdfTermArray,
} from "./jestRdfMatchers.js";
import { toBeLeft } from "./purifyMatchers.js";
import { toEqualRdfTermSet } from "./rdfxRdfMatchers.js";

export const matchers = {
  toBeRdfDatasetContaining,
  toBeRdfDatasetMatching,
  toBeRdfDatasetOfSize,
  toBeRdfIsomorphic,
  toEqualRdfQuad,
  toEqualRdfQuadArray,
  toEqualRdfTerm,
  toEqualRdfTermArray,
  toEqualRdfTermSet,
  toBeLeft,
};
