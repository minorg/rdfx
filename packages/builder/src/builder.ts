import type { NamespaceBuilder } from "@rdfjs/namespace";
import namespace from "@rdfjs/namespace";
import { sh } from "./sh.js";
import { skos } from "./skos.js";

export function builder<
  NamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(options?: { namespace?: NamespaceT }) {
  const namespace_ = (options?.namespace ?? namespace("")) as NamespaceT;

  return {
    sh: sh<NamespaceT>({ namespace: namespace_ }),
    skos: skos<NamespaceT>({ namespace: namespace_ }),
  };
}
