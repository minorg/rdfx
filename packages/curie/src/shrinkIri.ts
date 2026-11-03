import type { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type { NamedNode } from "@rdfjs/types";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Curie } from "./Curie.js";

/**
 * Try to shrink an IRI to a CURIE. Optionally tracks whether the reference part of the CURIE is unique.
 */
export function shrinkIri(
  iri: NamedNode,
  {
    prefixMap,
    referenceCounts = {},
  }: {
    prefixMap: PrefixMap;
    referenceCounts?: Record<string, Record<string, number>>;
  },
): Maybe<Curie> {
  return Maybe.fromNullable(prefixMap.shrink(iri)?.value).map((value) => {
    const split = value.split(":", 2);
    invariant(split.length === 2);
    const prefix = split[0];
    const reference = split[1];

    if (referenceCounts[reference] === undefined) {
      referenceCounts[reference] = {};
    }
    if (referenceCounts[reference][prefix] === undefined) {
      referenceCounts[reference][prefix] = 1;
    } else {
      referenceCounts[reference][prefix] += 1;
    }

    return new Curie({
      hasUniqueReference: () => {
        const referenceCounts_ = referenceCounts[reference];
        if (Object.entries(referenceCounts_).length === 1) {
          return true;
        }
        // logger.debug(
        //   `duplicate local part ${reference} in ${JSON.stringify(referenceCounts)}`,
        // );
        return false;
      },
      prefix: split[0],
      reference: split[1],
      value: iri.value,
    });
  });
}
