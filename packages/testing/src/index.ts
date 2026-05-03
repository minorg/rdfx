import type * as RDF from "@rdfjs/types";
import type { IQuadTerms } from "jest-rdf/lib/matchers/toBeRdfDatasetMatching.js";

import "vitest";

declare module "vitest" {
  interface Matchers<T = any> {
    toBeLeft(expected?: unknown): T;
    toBeRdfDatasetContaining: (...actual: RDF.BaseQuad[]) => T;
    toBeRdfDatasetMatching: (
      match: IQuadTerms<RDF.BaseQuad>,
      matches?: number,
    ) => T;
    toBeRdfDatasetOfSize: (size: number) => T;
    toBeRdfIsomorphic: (actual: Iterable<RDF.BaseQuad>) => T;
    toEqualRdfQuad: (actual: RDF.BaseQuad) => T;
    toEqualRdfQuadArray: (actual: RDF.BaseQuad[]) => T;
    toEqualRdfTerm: (actual: RDF.Term) => T;
    toEqualRdfTermArray: (actual: RDF.Term[]) => T;
  }
}

export { default as jestRdfMatchers } from "jest-rdf/lib/matchers";
export * as purifyMatchers from "./purifyMatchers.js";
