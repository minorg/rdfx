import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode } from "@rdfjs/types";
import type { IriLike } from "./IriLike.js";

export type IdentifierLike<NamespaceT extends NamespaceBuilder> =
  | BlankNode
  | IriLike<NamespaceT>
  | undefined;
