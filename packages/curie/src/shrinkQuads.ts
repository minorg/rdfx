import type { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory, NamedNode, Quad, Term } from "@rdfjs/types";
import type { Curie } from "./Curie.js";
import { shrinkIri } from "./shrinkIri.js";

export function* shrinkQuads(
  quads: Iterable<Quad>,
  {
    dataFactory,
    prefixMap,
  }: {
    dataFactory: DataFactory;
    prefixMap: PrefixMap;
  },
): Iterable<Quad> {
  const curieCache = new Map<string, Curie | NamedNode>();
  const referenceCounts: Record<string, Record<string, number>> = {};

  const termToCurie = <TermT extends Term>(term: TermT): TermT => {
    if (term.termType !== "NamedNode") {
      return term;
    }
    const cachedCurie = curieCache.get(term.value);
    if (cachedCurie) {
      return cachedCurie as TermT;
    }
    const curie =
      shrinkIri(term, { prefixMap, referenceCounts }).extract() ?? term;
    curieCache.set(term.value, curie);
    return curie as TermT;
  };

  for (const quad of quads) {
    const curieObject = termToCurie(quad.object);
    const curieSubject = termToCurie(quad.subject);

    if (
      !Object.is(curieObject, quad.object) ||
      !Object.is(curieSubject, quad.subject)
    ) {
      yield dataFactory.quad(
        curieSubject,
        quad.predicate,
        curieObject,
        quad.graph,
      );
    } else {
      yield quad;
    }
  }
}
