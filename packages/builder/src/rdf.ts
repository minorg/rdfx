import type { NamedNode } from "@rdfjs/types";
import type { NamespaceBuilder } from "@rdfx/iri";
import { rdf as _namespace } from "@tpluscode/rdf-ns-builders";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import { rdf_Property } from "./shapes.js";

export function rdf<DefaultNamespaceT extends NamespaceBuilder>({
  defaultNamespace,
}: BuilderBuilderParameters<DefaultNamespaceT>) {
  type DefaultNamespaceKey = keyof DefaultNamespaceT & string;

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    Property: (
      $identifier: DefaultNamespaceKey | NamedNode,
      parameters?: Omit<
        Parameters<typeof rdf_Property.createUnsafe<DefaultNamespaceT>>[0],
        "$defaultNamespace" | "$identifier"
      >,
    ): rdf_Property.Discriminated => {
      return rdf_Property.createUnsafe<DefaultNamespaceT>({
        ...parameters,
        $defaultNamespace: defaultNamespace,
        $identifier,
      });
    },
  };
}
