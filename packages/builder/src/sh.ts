import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, Literal, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { PropertyPath } from "@rdfx/resource";
import { sh_PropertyShape } from "./shapes.js";
import { toIri } from "./toIri.js";

export function sh<NamespaceT extends NamespaceBuilder>({
  namespace,
}: {
  namespace: NamespaceT;
}) {
  return {
    PropertyShape: (
      $identifier: BlankNode | NamedNode | keyof NamespaceT | undefined,
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
        readonly classes?: readonly (NamedNode | keyof NamespaceT)[];
        readonly in_?:
          | readonly (NamedNode | Literal)[]
          | readonly bigint[]
          | readonly boolean[]
          | readonly number[]
          | readonly string[];
        //   | ConceptScheme<Record<string, unknown>>
        readonly node?: NamedNode | keyof NamespaceT;
        readonly path?: PropertyPath | keyof NamespaceT;
        readonly resolve?: NamedNode | keyof NamespaceT;
      },
    ): ReturnType<typeof sh_PropertyShape.createUnsafe> => {
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

      let $identifierTerm: BlankNode | NamedNode;
      switch (typeof $identifier) {
        case "object":
          $identifierTerm = $identifier;
          break;
        case "string":
          $identifierTerm = toIri($identifier, namespace);
          break;
        case "undefined":
          $identifierTerm = dataFactory.blankNode();
          break;
        default:
          throw new RangeError(typeof $identifier);
      }

      let in_: readonly NamedNode[] | undefined;
      // let inConceptScheme: ConceptScheme<any> | undefined;
      // if (inParameter) {
      //   if (Array.isArray(inParameter)) {
      //     in_ = inParameter;
      //   } else {
      //     inConceptScheme = inParameter as ConceptScheme<any>;
      //     in_ = Object.values(inConceptScheme.concepts).map(
      //       (concept) => concept.identifier,
      //     );
      //   }
      // }

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

      let classes: readonly NamedNode[] | undefined;
      if (parameters.classes) {
        classes = parameters.classes.map((class_) => toIri(class_, namespace));
      }
      // else if (inConceptScheme) {
      //   classes = [(namespace as any)(inConceptScheme.className)];
      // }

      const finalParameters = {
        ...otherParameters,
        $identifier: $identifierTerm,
        classes,
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
    },
  };
}
