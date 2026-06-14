import type { NamespaceBuilder } from "@rdfjs/namespace";
import namespace from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import { skos } from "@tpluscode/rdf-ns-builders";

export function builder<
  NamespaceT extends object = NamespaceBuilder,
>(options?: { namespace?: NamespaceT }) {
  const ns = (options?.namespace ?? namespace("")) as NamespaceBuilder;

  return (x: keyof NamespaceT): NamedNode => {
    return ns[x as string];
  };
}
builder({ namespace: skos })("broader");
