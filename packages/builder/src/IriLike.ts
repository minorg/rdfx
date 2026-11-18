import type { NamedNode } from "@rdfjs/types";
import type { NamespaceBuilder } from "@rdfx/iri";

export type IriLike<DefaultNamespaceT extends NamespaceBuilder> =
  | (keyof DefaultNamespaceT & string)
  | NamedNode;
