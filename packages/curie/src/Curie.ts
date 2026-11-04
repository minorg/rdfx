import type { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";

/**
 * Try to shrink an IRI to a CURIE. Optionally tracks whether the reference part of the CURIE is unique.
 */
export function shrinkIri(
  iri: NamedNode,
  {
    prefixMap,
  }: {
    prefixMap: PrefixMap;
  },
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

/**
 * A Compact URI (https://www.w3.org/TR/curie)
 */
export class Curie implements NamedNode {
  readonly prefix: string;
  readonly reference: string;
  readonly termType = "NamedNode";
  readonly value: string;

  constructor({
    prefix,
    reference,
    value,
  }: {
    prefix: string;
    reference: string;
    value: string;
  }) {
    this.prefix = prefix;
    this.reference = reference;
    this.value = value;
  }

  equals(other: BlankNode | NamedNode): boolean {
    if (other.termType === "BlankNode") {
      return false;
    }

    return this.value === other.value; // Allow a Curie to equal a NamedNode
  }

  static fromIri(
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

  toString(): string {
    return `${this.prefix}:${this.reference}`;
  }
}
