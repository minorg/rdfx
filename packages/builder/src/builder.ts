import type { BlankNode, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { type NamespaceBuilder, namespace } from "@rdfx/iri";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import type { IdentifierLike } from "./IdentifierLike.js";
import type { IriLike } from "./IriLike.js";
import { rdf } from "./rdf.js";
import { rdfs } from "./rdfs.js";
import { sh } from "./sh.js";
import { skos } from "./skos.js";

export function builder<
  DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(options?: { defaultNamespace?: DefaultNamespaceT }) {
  const defaultNamespace = (options?.defaultNamespace ??
    namespace("")) as DefaultNamespaceT;

  const toIri = (iri: IriLike<DefaultNamespaceT>): NamedNode => {
    switch (typeof iri) {
      case "object":
        return iri;
      case "string":
        return defaultNamespace(iri) as NamedNode;
      default:
        throw new RangeError(typeof iri);
    }
  };

  const builderBuilderParameters: BuilderBuilderParameters<DefaultNamespaceT> =
    {
      defaultNamespace,

      toIdentifier: (
        identifier: IdentifierLike<DefaultNamespaceT>,
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
        iriArray:
          | IriLike<DefaultNamespaceT>
          | readonly IriLike<DefaultNamespaceT>[],
      ): readonly NamedNode[] => {
        if (Array.isArray(iriArray)) {
          return iriArray.map(toIri);
        }
        return [toIri(iriArray as IriLike<DefaultNamespaceT>)];
      },
    };

  return {
    rdf: rdf<DefaultNamespaceT>(builderBuilderParameters),
    rdfs: rdfs<DefaultNamespaceT>(builderBuilderParameters),
    sh: sh<DefaultNamespaceT>(builderBuilderParameters),
    skos: skos<DefaultNamespaceT>(builderBuilderParameters),
  };
}
