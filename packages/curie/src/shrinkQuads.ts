import type { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory, NamedNode, Quad, Term } from "@rdfjs/types";
import { Curie } from "./Curie.js";

export function* shrinkQuads(
  quads: Iterable<Quad>,
  {
    dataFactory,
    prefixMap,
    referenceCounts,
  }: {
    dataFactory: DataFactory;
    prefixMap: PrefixMap;
    referenceCounts?: Record<string, number>;
  },
): Iterable<Quad> {
  const curieCache = new Map<string, Curie | NamedNode>();

  const shrinkTerm = <TermT extends Term>(term: TermT): TermT => {
    if (term.termType !== "NamedNode") {
      return term;
    }

    const cachedCurie = curieCache.get(term.value);
    if (cachedCurie) {
      if (referenceCounts && cachedCurie instanceof Curie) {
        referenceCounts[cachedCurie.reference] =
          (referenceCounts[cachedCurie.reference] ?? 0) + 1;
      }
      return cachedCurie as TermT;
    }

    const curie = Curie.fromIri(term, { prefixMap }).extract();
    if (curie && referenceCounts) {
      referenceCounts[curie.reference] =
        (referenceCounts[curie.reference] ?? 0) + 1;
    }
    curieCache.set(term.value, curie ?? term);

    return (curie ?? term) as TermT;
  };

  for (const quad of quads) {
    yield dataFactory.quad(
      shrinkTerm(quad.subject),
      shrinkTerm(quad.predicate),
      shrinkTerm(quad.object),
      shrinkTerm(quad.graph),
    );
  }
}
