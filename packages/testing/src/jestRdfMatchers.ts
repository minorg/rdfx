/**
 * Code adapted from jest-rdf (https://www.npmjs.com/package/jest-rdf, MIT license) to circumvent build errors in reusing its matchers.
 */

import type * as RDF from "@rdfjs/types";

import {
  getGraphBlankNodes,
  getQuadsWithBlankNodes,
  hashTerms,
  type ITermHash,
  isomorphic,
  uniqGraph,
} from "rdf-isomorphic";
import { quadToStringQuad, termToString } from "rdf-string";
import { everyTerms, someTerms } from "rdf-terms";

export interface IQuadTerms<TQuad extends RDF.BaseQuad = RDF.Quad> {
  graph?: TQuad["graph"];
  object?: TQuad["object"];
  predicate?: TQuad["predicate"];
  subject?: TQuad["subject"];
}

function fail(
  received: RDF.Term,
  actual: RDF.Term,
): { message: () => string; pass: false } {
  return {
    message: () =>
      `expected ${termToString(received)} and ${termToString(actual)} to be equal`,
    pass: false,
  };
}

function getNonBlankDiff<TQuad extends RDF.BaseQuad = RDF.Quad>(
  a1: TQuad[],
  a2: TQuad[],
): TQuad[] {
  return a1.filter(
    (quad) =>
      everyTerms(quad, (term) => term.termType !== "BlankNode") &&
      a2.every((q2) => !q2.equals(quad)),
  );
}

function quadArrayToString<TQuad extends RDF.BaseQuad = RDF.Quad>(
  quadArray: TQuad[],
): string {
  return `[ ${quadArray.map((quad) => JSON.stringify(quadToStringQuad(quad))).join(", ")} ]`;
}

function succeed(
  received: RDF.Term,
  actual: RDF.Term,
): { message: () => string; pass: true } {
  return {
    message: () =>
      `expected ${termToString(received)} and ${termToString(actual)} not to be equal`,
    pass: true,
  };
}

function termArrayToString(termArray: RDF.Term[]): string {
  return `[ ${termArray.map((term) => JSON.stringify(termToString(term))).join(", ")} ]`;
}

function getBnodeDiff<TQuad extends RDF.BaseQuad = RDF.Quad>(
  receivedQuads: TQuad[],
  expectedQuads: TQuad[],
): { received: Record<string, TQuad[]>; expected: Record<string, TQuad[]> } {
  // Hash every term based on the signature of the quads if appears in.
  const ungroundedHashesA = unGroundHashes(receivedQuads);
  const ungroundedHashesB = unGroundHashes(expectedQuads);
  const blankA = uniqGraph(getQuadsWithBlankNodes(receivedQuads));
  const blankB = uniqGraph(getQuadsWithBlankNodes(expectedQuads));

  const received: Record<string, TQuad[]> = {};
  const expected: Record<string, TQuad[]> = {};

  for (const elem of getDiff(ungroundedHashesA, ungroundedHashesB)) {
    received[elem] = blankA.filter((quad) =>
      someTerms(
        quad,
        (term) => term.termType === "BlankNode" && term.value === elem.slice(2),
      ),
    );
  }

  for (const elem of getDiff(ungroundedHashesB, ungroundedHashesA)) {
    expected[elem] = blankB.filter((quad) =>
      someTerms(
        quad,
        (term) => term.termType === "BlankNode" && term.value === elem.slice(2),
      ),
    );
  }

  return {
    received,
    expected,
  };
}

function getDiff(hash1: ITermHash, hash2: ITermHash): string[] {
  const diffed: string[] = [];
  const values = new Set(Object.values(hash2));
  for (const key in hash1) {
    if (!values.has(hash1[key])) {
      diffed.push(key);
    }
  }
  return diffed;
}

export function toBeRdfDatasetContaining<TQuad extends RDF.BaseQuad = RDF.Quad>(
  dataset: RDF.DatasetCore<TQuad>,
  ...quads: TQuad[]
) {
  for (const quad of quads) {
    if (!dataset.has(quad)) {
      return {
        message: () =>
          `expected dataset to have quads ${quadArrayToString(quads)}`,
        pass: false,
      };
    }
  }

  return {
    message: () =>
      `expected dataset to not have quads ${quadArrayToString(quads)}`,
    pass: true,
  };
}

export function toBeRdfDatasetMatching<TQuad extends RDF.BaseQuad = RDF.Quad>(
  dataset: RDF.DatasetCore<TQuad>,
  { subject, predicate, object, graph }: IQuadTerms<TQuad>,
  matches = 1,
) {
  const times = matches === 1 ? "once" : `${matches} times`;

  if (dataset.match(subject, predicate, object, graph).size !== matches) {
    return {
      message: () =>
        `expected dataset to match ${JSON.stringify({ subject, predicate, object, graph })} ${times}`,
      pass: false,
    };
  }

  return {
    message: () =>
      `expected dataset to not match ${JSON.stringify({ subject, predicate, object, graph })} ${times}`,
    pass: true,
  };
}

export function toBeRdfDatasetOfSize<TQuad extends RDF.BaseQuad = RDF.Quad>(
  dataset: RDF.DatasetCore<TQuad>,
  expected: number,
) {
  const actual = dataset.size;

  if (expected !== actual) {
    return {
      message: () =>
        `expected dataset to have ${expected} quads, ${actual} received`,
      pass: false,
    };
  }

  return {
    message: () => `expected dataset to not have exactly ${expected} quads`,
    pass: true,
  };
}

export function toBeRdfIsomorphic<TQuad extends RDF.BaseQuad = RDF.Quad>(
  received: Iterable<TQuad>,
  actual: Iterable<TQuad>,
) {
  const receivedArray = [...received];
  const actualArray = [...actual];

  if (!isomorphic(receivedArray, actualArray)) {
    const { received: receivedBnodes, expected: actualBnodes } = getBnodeDiff(
      receivedArray,
      actualArray,
    );

    return {
      message: () => `expected two graphs to be isomorphic.

  Expected:
${quadArrayToString(actualArray)}

  Actual:
${quadArrayToString(receivedArray)}

Missing Quads (that don't contain Blank Nodes):
${quadArrayToString(getNonBlankDiff(actualArray, receivedArray))}

Additional Quads (that don't contain Blank Nodes):
${quadArrayToString(getNonBlankDiff(receivedArray, actualArray))}

Missing Blank Node Patterns:
${Object.entries(actualBnodes)
  .map(([bnode, quads]) => `${bnode} : ${quadArrayToString(quads)}`)
  .join("\n")}

Additional Blank Node Patterns:
${Object.entries(receivedBnodes)
  .map(([bnode, quads]) => `${bnode} : ${quadArrayToString(quads)}`)
  .join("\n")}
`,
      pass: false,
    };
  }

  return {
    message: () => `expected two graphs not to be isomorphic.

  Expected:
${quadArrayToString(actualArray)}

  Actual:
${quadArrayToString(receivedArray)}
`,
    pass: true,
  };
}

export function toEqualRdfQuad<TQuad extends RDF.BaseQuad = RDF.Quad>(
  received: TQuad,
  actual: TQuad,
) {
  const s = toEqualRdfTerm(received.subject, actual.subject);
  if (!s.pass) {
    return s;
  }
  const p = toEqualRdfTerm(received.predicate, actual.predicate);
  if (!p.pass) {
    return p;
  }
  const o = toEqualRdfTerm(received.object, actual.object);
  if (!o.pass) {
    return o;
  }
  const g = toEqualRdfTerm(received.graph, actual.graph);
  if (!g.pass) {
    return g;
  }

  return {
    message: () => `expected
  ${JSON.stringify(quadToStringQuad(received))}
not to equal
  ${JSON.stringify(quadToStringQuad(actual))}`,
    pass: true,
  };
}

export function toEqualRdfQuadArray<TQuad extends RDF.BaseQuad = RDF.Quad>(
  received: TQuad[],
  actual: TQuad[],
) {
  if (received.length !== actual.length) {
    return {
      message: () =>
        `expected ${quadArrayToString(received)} to equal ${quadArrayToString(actual)}`,
      pass: false,
    };
  }

  for (const [i, element] of received.entries()) {
    const q = toEqualRdfQuad(element, actual[i]);
    if (!q.pass) {
      return q;
    }
  }

  return {
    message: () =>
      `expected ${quadArrayToString(received)} not to equal ${quadArrayToString(actual)}`,
    pass: true,
  };
}

export function toEqualRdfTerm(received: RDF.Term, actual: RDF.Term) {
  if (received.termType !== actual.termType) {
    return fail(received, actual);
  }

  if (received.termType !== "BlankNode" && !received.equals(actual)) {
    return fail(received, actual);
  }

  return succeed(received, actual);
}

export function toEqualRdfTermArray(received: RDF.Term[], actual: RDF.Term[]) {
  if (received.length !== actual.length) {
    return {
      message: () =>
        `expected ${termArrayToString(received)} to equal ${termArrayToString(actual)}`,
      pass: false,
    };
  }

  for (const [i, element] of received.entries()) {
    const q = toEqualRdfTerm(element, actual[i]);
    if (!q.pass) {
      return q;
    }
  }

  return {
    message: () =>
      `expected ${termArrayToString(received)} not to equal ${termArrayToString(actual)}`,
    pass: true,
  };
}

function unGroundHashes<TQuad extends RDF.BaseQuad = RDF.Quad>(
  graph: TQuad[],
): ITermHash {
  return hashTerms(
    uniqGraph(getQuadsWithBlankNodes(graph)),
    getGraphBlankNodes(graph),
    {},
  )[1];
}
