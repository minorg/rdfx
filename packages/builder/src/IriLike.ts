import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";

export type IriLike<DefaultNamespaceT extends NamespaceBuilder> =
  | (keyof DefaultNamespaceT & string)
  | NamedNode;
