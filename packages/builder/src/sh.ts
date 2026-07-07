import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, Literal, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { PropertyPath } from "@rdfx/resource";
import { sh as _namespace } from "@tpluscode/rdf-ns-builders";
import {
  sh_NodeShape,
  sh_PropertyShape,
  type skos_ConceptScheme,
} from "./shapes.js";
import { toIri } from "./toIri.js";

export function sh<NamespaceT extends NamespaceBuilder>({
  namespace,
}: {
  namespace: NamespaceT;
}) {
  type NamespaceKey = keyof NamespaceT & string;

  function toIdentifier(
    identifier: BlankNode | NamedNode | NamespaceKey | undefined,
  ): BlankNode | NamedNode {
    switch (typeof identifier) {
      case "object":
        return identifier;
      case "string":
        return toIri(identifier, namespace);
      case "undefined":
        return dataFactory.blankNode();
      default:
        throw new RangeError(typeof identifier);
    }
  }

  function PropertyShape(
    $identifier: BlankNode | NamedNode | NamespaceKey | undefined,
    parameters: Omit<
      NonNullable<Parameters<typeof sh_PropertyShape.createUnsafe>[0]>,
      | "$identifier"
      | "classes"
      | "in_"
      | "maxCount"
      | "minCount"
      | "node"
      | "path"
      | "resolve"
    > & {
      readonly cardinality: "optional" | "required" | "set";
      readonly classes?: readonly (NamedNode | NamespaceKey)[];
      readonly in_?:
        | readonly (NamedNode | Literal)[]
        | readonly bigint[]
        | readonly boolean[]
        | readonly number[]
        | readonly string[]
        | skos_ConceptScheme;
      readonly node?: NamedNode | NamespaceKey;
      readonly path?: PropertyPath | NamespaceKey;
      readonly resolve?: NamedNode | NamespaceKey;
    },
  ): ReturnType<typeof sh_PropertyShape.createUnsafe> {
    // Order of default population matters here.

    const {
      cardinality: cardinalityParameter,
      classes: classesParameter,
      in_: inParameter,
      path: pathParameter,
      node: nodeParameter,
      resolve: resolveParameter,
      ...otherParameters
    } = parameters;

    const $identifierTerm = toIdentifier($identifier);

    let in_: readonly NamedNode[] | undefined;
    let inConceptScheme: skos_ConceptScheme;
    if (inParameter) {
      if (Array.isArray(inParameter)) {
        in_ = inParameter;
      } else {
        inConceptScheme = inParameter as skos_ConceptScheme;
        in_ = inConceptScheme.concepts.map((concept) =>
          concept.termType === "NamedNode" ? concept : concept.$identifier(),
        );
      }
    }

    let path: PropertyPath;
    switch (typeof pathParameter) {
      case "object":
        path = pathParameter;
        break;
      case "string":
        path = toIri(pathParameter, namespace);
        break;
      case "undefined":
        if ($identifierTerm.termType === "BlankNode") {
          throw new Error(
            "must specify a path if identifier is a BlankNode/undefined",
          );
        }
        path = $identifierTerm;
        break;
      default:
        throw new RangeError(typeof pathParameter);
    }

    let maxCount: bigint | undefined;
    let minCount: bigint | undefined;
    switch (cardinalityParameter) {
      case "optional":
        maxCount = 1n;
        break;
      case "required":
        maxCount = 1n;
        minCount = 1n;
        break;
      case "set":
        break;
    }

    const finalParameters = {
      ...otherParameters,
      $identifier: $identifierTerm,
      classes: parameters.classes
        ? parameters.classes.map((class_) => toIri(class_, namespace))
        : undefined,
      in_,
      maxCount,
      minCount,
      node: nodeParameter ? toIri(nodeParameter, namespace) : undefined,
      path,
      resolve: resolveParameter
        ? toIri(resolveParameter, namespace)
        : undefined,
    };

    return sh_PropertyShape.createUnsafe(finalParameters);
  }

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    NodeShape: (
      $identifier: BlankNode | NamedNode | NamespaceKey | undefined,
    ): sh_NodeShape => {
      const $identifierTerm = toIdentifier($identifier);

      return sh_NodeShape.createUnsafe({
        $identifier: $identifierTerm,
      });
    },

    PropertyShape,
  };
}
