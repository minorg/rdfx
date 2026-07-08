import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import type { IdentifierLike } from "./IdentifierLike.js";
import type { IriLike } from "./IriLike.js";

export interface BuilderBuilderParameters<NamespaceT extends NamespaceBuilder> {
  namespace: NamespaceT;

  toIdentifier: (
    identifier: IdentifierLike<NamespaceT>,
  ) => BlankNode | NamedNode;
  toIri: (iri: IriLike<NamespaceT>) => NamedNode;
  toIriArray: (
    iriArray: IriLike<NamespaceT> | readonly IriLike<NamespaceT>[],
  ) => readonly NamedNode[];
}
