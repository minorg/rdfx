import type * as RDF from '@rdfjs/types';

import 'vitest'

declare module 'vitest' {
  interface Matchers<R = unknown> {
    toBeRdfDatasetContaining: (...actual: RDF.BaseQuad[]) => R;
    toBeRdfDatasetMatching: (match: IQuadTerms<RDF.BaseQuad>, matches?: number) => R;
    toBeRdfDatasetOfSize: (size: number) => R;
    toBeRdfIsomorphic: (actual: Iterable<RDF.BaseQuad>) => R;
    toEqualRdfQuad: (actual: RDF.BaseQuad) => R;
    toEqualRdfQuadArray: (actual: RDF.BaseQuad[]) => R;
    toEqualRdfTerm: (actual: RDF.Term) => R;
    toEqualRdfTermArray: (actual: RDF.Term[]) => R;
  }
}
