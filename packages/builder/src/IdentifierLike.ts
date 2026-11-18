import type { BlankNode } from "@rdfjs/types";
import type { NamespaceBuilder } from "@rdfx/iri";
import type { IriLike } from "./IriLike.js";

export type IdentifierLike<DefaultNamespaceT extends NamespaceBuilder> =
  | BlankNode
  | IriLike<DefaultNamespaceT>
  | undefined;
