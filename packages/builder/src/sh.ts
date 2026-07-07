import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, Literal, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { LiteralFactory } from "@rdfx/literal";
import type { PropertyPath } from "@rdfx/resource";
import { sh as _namespace } from "@tpluscode/rdf-ns-builders";
import {
  sh_NodeShape,
  sh_PropertyShape,
  type skos_ConceptScheme,
} from "./shapes.js";
import { toIri } from "./toIri.js";

type InArray = readonly (
  | bigint
  | boolean
  | Date
  | Literal
  | NamedNode
  | number
  | string
)[];

const literalFactory = new LiteralFactory({ dataFactory });

function toIn(
  in_?: skos_ConceptScheme | InArray,
): readonly (Literal | NamedNode)[] | undefined {
  if (!in_) {
    return undefined;
  }

  if (Array.isArray(in_)) {
    const inArray: InArray = in_;
    return inArray.map((item) => {
      if (typeof item === "object") {
        if (item instanceof Date) {
          return literalFactory.date(item);
        }
        return item;
      }

      return literalFactory.primitive(item);
    });
  }

  const inConceptScheme = in_ as skos_ConceptScheme;
  return inConceptScheme.concepts.map((concept) =>
    concept.termType === "NamedNode" ? concept : concept.$identifier(),
  );
}

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
    parameters?: Omit<
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
      readonly cardinality?: "optional" | "required" | "set";
      readonly classes?: readonly (NamedNode | NamespaceKey)[];
      readonly in_?: skos_ConceptScheme | InArray;
      readonly node?: NamedNode | NamespaceKey;
      readonly path?: NamespaceKey | PropertyPath;
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
    } = parameters ?? {};

    const $identifierTerm = toIdentifier($identifier);

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
    if (cardinalityParameter) {
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
    }

    return sh_PropertyShape.createUnsafe({
      ...otherParameters,
      $identifier: $identifierTerm,
      classes: classesParameter
        ? classesParameter.map((class_) => toIri(class_, namespace))
        : undefined,
      in_: toIn(inParameter),
      maxCount,
      minCount,
      node: nodeParameter ? toIri(nodeParameter, namespace) : undefined,
      path,
      resolve: resolveParameter
        ? toIri(resolveParameter, namespace)
        : undefined,
    });
  }

  type NodeShapePropertyArray = readonly (
    | NamedNode
    | NamespaceKey
    | sh_PropertyShape
  )[];

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    NodeShape: (
      $identifier: BlankNode | NamedNode | NamespaceKey | undefined,
      parameters?: Omit<
        NonNullable<Parameters<typeof sh_NodeShape.createUnsafe>[0]>,
        "$identifier" | "in_" | "properties" | "xone"
      > & {
        readonly in_?: skos_ConceptScheme | InArray;
        readonly properties?:
          | Record<
              string,
              Omit<
                NonNullable<Parameters<typeof PropertyShape>[1]>,
                "$identifier" | "path"
              > & {
                readonly $identifier?: Parameters<typeof PropertyShape>[0];
                readonly path?: NamespaceKey | PropertyPath;
              }
            >
          | NodeShapePropertyArray;
        readonly xone?: readonly (NamedNode | NamespaceKey)[];
      },
    ): sh_NodeShape => {
      const nodeShapeIdentifier = toIdentifier($identifier);

      const {
        in_: inParameter,
        properties: propertiesParameter,
        xone: xoneParameter,
        ...otherParameters
      } = parameters ?? {};

      let properties: (NamedNode | sh_PropertyShape)[] | undefined;
      if (propertiesParameter) {
        if (Array.isArray(propertiesParameter)) {
          properties = (propertiesParameter as NodeShapePropertyArray).map(
            (property) => {
              if (typeof property === "string") {
                return toIri(property, namespace);
              }
              return property;
            },
          );
        } else {
          properties = Object.entries(propertiesParameter).map(
            ([key, propertyParameters]) => {
              let {
                $identifier,
                path,
                name,
                shaclmateName,
                ...otherPropertyParameters
              } = propertyParameters;

              // Order of checks here is important.
              if (typeof $identifier === "function") {
                $identifier = $identifier();
              }

              if (!$identifier) {
                if (nodeShapeIdentifier.termType === "NamedNode") {
                  $identifier = dataFactory.namedNode(
                    `${nodeShapeIdentifier.value}-${key}`,
                  );
                } else {
                  $identifier = dataFactory.blankNode();
                }
              }

              if (!name && !shaclmateName) {
                name = key;
              }

              if (!path) {
                path = (namespace as NamespaceBuilder)(key);
              }

              return sh_PropertyShape.createUnsafe({
                ...otherPropertyParameters,
                $identifier,
                name,
                path,
                shaclmateName,
              });
            },
          );
        }
      }

      return sh_NodeShape.createUnsafe({
        ...otherParameters,
        $identifier: nodeShapeIdentifier,
        in_: toIn(inParameter),
        properties,
        xone: xoneParameter
          ? xoneParameter.map((member) => toIri(member, namespace))
          : undefined,
      });
    },

    PropertyShape,
  };
}
