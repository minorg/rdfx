import type { NamedNode } from "@rdfjs/types";
import type { NamespaceBuilder } from "@rdfx/iri";
import { rdfs as _namespace } from "@tpluscode/rdf-ns-builders";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import { rdfs_Class } from "./shapes.js";

export function rdfs<DefaultNamespaceT extends NamespaceBuilder>({
  defaultNamespace,
}: BuilderBuilderParameters<DefaultNamespaceT>) {
  type DefaultNamespaceKey = keyof DefaultNamespaceT & string;

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    Class: (
      $identifier: DefaultNamespaceKey | NamedNode,
      parameters?: Omit<
        Parameters<typeof rdfs_Class.createUnsafe<DefaultNamespaceT>>[0],
        "$defaultNamespace" | "$identifier"
      >,
    ): rdfs_Class.Discriminated => {
      return rdfs_Class.createUnsafe<DefaultNamespaceT>({
        ...parameters,
        $defaultNamespace: defaultNamespace,
        $identifier,
      });
    },
  };
}
