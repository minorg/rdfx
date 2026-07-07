import type { NamespaceBuilder } from "@rdfjs/namespace";
import namespace from "@rdfjs/namespace";
import type { BlankNode, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import type { IdentifierLike } from "./IdentifierLike.js";
import type { IriLike } from "./IriLike.js";
import { sh } from "./sh.js";
import { skos } from "./skos.js";

export function builder<
  NamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(options?: { namespace?: NamespaceT }) {
  const namespace_ = (options?.namespace ?? namespace("")) as NamespaceT;

  const toIri = (iri: IriLike<NamespaceT>): NamedNode => {
    switch (typeof iri) {
      case "object":
        return iri;
      case "string":
        return namespace_(iri) as NamedNode;
      default:
        throw new RangeError(typeof iri);
    }
  };

  const builderBuilderParameters: BuilderBuilderParameters<NamespaceT> = {
    namespace: namespace_,

    toIdentifier: (
      identifier: IdentifierLike<NamespaceT>,
    ): BlankNode | NamedNode => {
      switch (typeof identifier) {
        case "object":
          return identifier;
        case "string":
          return toIri(identifier);
        case "undefined":
          return dataFactory.blankNode();
        default:
          throw new RangeError(typeof identifier);
      }
    },
    toIri,
    toIriArray: (
      iriArray: IriLike<NamespaceT> | readonly IriLike<NamespaceT>[],
    ): readonly NamedNode[] => {
      if (Array.isArray(iriArray)) {
        return iriArray.map(toIri);
      }
      return [toIri(iriArray as IriLike<NamespaceT>)];
    },
  };

  return {
    sh: sh<NamespaceT>(builderBuilderParameters),
    skos: skos<NamespaceT>(builderBuilderParameters),
  };
}
