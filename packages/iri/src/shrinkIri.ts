import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { NamedNode } from "@rdfjs/types";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Curie } from "./Curie.js";

export function shrinkIri(
  iri: NamedNode,
  { prefixMap }: { prefixMap: PrefixMap },
): Maybe<Curie> {
  return Maybe.fromNullable(prefixMap.shrink(iri)?.value).map((value) => {
    const split = value.split(":", 2);
    invariant(split.length === 2);
    return new Curie({
      prefix: split[0],
      reference: split[1],
      value: iri.value,
    });
  });
}
