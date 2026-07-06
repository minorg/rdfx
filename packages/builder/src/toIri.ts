import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";

export function toIri<NamespaceT extends NamespaceBuilder>(
  iri: (keyof NamespaceT & string) | NamedNode,
  namespace: NamespaceT,
): NamedNode {
  switch (typeof iri) {
    case "object":
      return iri;
    case "string":
      return namespace(iri) as NamedNode;
    default:
      throw new RangeError(typeof iri);
  }
}
