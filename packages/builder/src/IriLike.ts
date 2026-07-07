import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";

export type IriLike<NamespaceT extends NamespaceBuilder> =
  | (keyof NamespaceT & string)
  | NamedNode;
