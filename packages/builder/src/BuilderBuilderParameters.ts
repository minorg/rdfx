import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import type { IdentifierLike } from "./IdentifierLike.js";
import type { IriLike } from "./IriLike.js";

export interface BuilderBuilderParameters<
  DefaultNamespaceT extends NamespaceBuilder,
> {
  defaultNamespace: DefaultNamespaceT;

  toIdentifier: (
    identifier: IdentifierLike<DefaultNamespaceT>,
  ) => BlankNode | NamedNode;
  toIri: (iri: IriLike<DefaultNamespaceT>) => NamedNode;
  toIriArray: (
    iriArray:
      | IriLike<DefaultNamespaceT>
      | readonly IriLike<DefaultNamespaceT>[],
  ) => readonly NamedNode[];
}
