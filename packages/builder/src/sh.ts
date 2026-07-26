import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { BlankNode, Literal, NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { LiteralFactory } from "@rdfx/literal";
import type { PropertyPath } from "@rdfx/resource";
import { sh as _namespace, owl, rdfs } from "@tpluscode/rdf-ns-builders";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import type { IriLike } from "./IriLike.js";
import {
  sh_NodeShape,
  sh_PropertyShape,
  type skos_ConceptScheme,
} from "./shapes.js";

type ConvertibleInArray = readonly (
  | bigint
  | boolean
  | Date
  | Literal
  | NamedNode
  | number
  | string
)[];

type NodeKindIri =
  | (typeof _namespace)["BlankNode"]
  | (typeof _namespace)["BlankNodeOrIRI"]
  | (typeof _namespace)["BlankNodeOrLiteral"]
  | (typeof _namespace)["IRI"]
  | (typeof _namespace)["IRIOrLiteral"]
  | (typeof _namespace)["Literal"];

type NodeKindString =
  | "BlankNode"
  | "BlankNodeOrIRI"
  | "BlankNodeOrLiteral"
  | "IRI"
  | "IRIOrLiteral"
  | "Literal";

const literalFactory = new LiteralFactory({ dataFactory });

function convertIn(
  in_?: skos_ConceptScheme | ConvertibleInArray,
): readonly (Literal | NamedNode)[] | undefined {
  if (!in_) {
    return undefined;
  }

  if (Array.isArray(in_)) {
    const inArray: ConvertibleInArray = in_;
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

function convertNodeKind(
  nodeKind?: NodeKindIri | NodeKindString,
): NodeKindIri | undefined {
  if (!nodeKind) {
    return undefined;
  }
  if (typeof nodeKind === "object") {
    return nodeKind;
  }
  return _namespace[nodeKind];
}

export function sh<DefaultNamespaceT extends NamespaceBuilder>({
  defaultNamespace,
  toIdentifier,
  toIri,
  toIriArray,
}: BuilderBuilderParameters<DefaultNamespaceT>) {
  type DefaultNamespaceKey = keyof DefaultNamespaceT & string;

  function PropertyShape(
    $identifier:
      | Exclude<
          NonNullable<
            Parameters<
              typeof sh_PropertyShape.createUnsafe<DefaultNamespaceT>
            >[0]
          >["$identifier"],
          string | (() => sh_PropertyShape.Identifier)
        >
      | DefaultNamespaceKey,
    parameters?: Omit<
      NonNullable<
        Parameters<typeof sh_PropertyShape.createUnsafe<DefaultNamespaceT>>[0]
      >,
      | "$identifier"
      | "in_"
      | "maxCount"
      | "minCount"
      | "node"
      | "nodeKind"
      | "path"
    > & {
      readonly cardinality?: "optional" | "required" | "set";
      readonly in_?: skos_ConceptScheme | ConvertibleInArray;
      readonly node?: NamedNode | DefaultNamespaceKey;
      readonly nodeKind?: NodeKindIri | NodeKindString;
      readonly path?: DefaultNamespaceKey | PropertyPath;
    },
  ): ReturnType<typeof sh_PropertyShape.createUnsafe<DefaultNamespaceT>> {
    // Order of default population matters here.

    const {
      cardinality: cardinalityParameter,
      in_: inParameter,
      path: pathParameter,
      node: nodeParameter,
      nodeKind: nodeKindParameter,
      ...otherParameters
    } = parameters ?? {};

    const $identifierTerm = toIdentifier($identifier);

    let path: PropertyPath;
    switch (typeof pathParameter) {
      case "object":
        path = pathParameter;
        break;
      case "string":
        path = toIri(pathParameter);
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

    return sh_PropertyShape.createUnsafe<DefaultNamespaceT>({
      ...otherParameters,
      $defaultNamespace: defaultNamespace,
      $identifier: $identifierTerm,
      in_: convertIn(inParameter),
      maxCount,
      minCount,
      node: nodeParameter ? toIri(nodeParameter) : undefined,
      nodeKind: nodeKindParameter
        ? convertNodeKind(nodeKindParameter)
        : undefined,
      path,
    });
  }

  type NodeShapePropertyArray = readonly (
    | NamedNode
    | DefaultNamespaceKey
    | sh_PropertyShape
  )[];

  type NodeShapePropertiesRecordValue = Omit<
    NonNullable<Parameters<typeof PropertyShape>[1]>,
    "$identifier" | "path"
  > & {
    readonly $identifier?: Parameters<typeof PropertyShape>[0];
    readonly path?: DefaultNamespaceKey | PropertyPath;
  };
  type NodeShapePropertiesRecord = Record<
    string,
    NodeShapePropertiesRecordValue
  >;

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    NodeShape: (
      $identifier:
        | Exclude<
            NonNullable<
              Parameters<typeof sh_NodeShape.createUnsafe<DefaultNamespaceT>>[0]
            >["$identifier"],
            string | (() => sh_NodeShape.Identifier)
          >
        | DefaultNamespaceKey,
      parameters?: Omit<
        NonNullable<
          Parameters<typeof sh_NodeShape.createUnsafe<DefaultNamespaceT>>[0]
        >,
        | "$identifier"
        | "in_"
        | "nodeKind"
        | "properties"
        | "shaclmateName"
        | "type"
      > & {
        readonly in_?: skos_ConceptScheme | ConvertibleInArray;
        readonly implicitClassTarget?: true;
        readonly nodeKind?: NodeKindIri | NodeKindString;
        readonly properties?:
          | NodeShapePropertiesRecord
          | NodeShapePropertyArray;
        readonly type?:
          | IriLike<DefaultNamespaceT>
          | readonly IriLike<DefaultNamespaceT>[];
        readonly shaclmateName?: string;
      },
    ): sh_NodeShape => {
      const nodeShapeIdentifier = toIdentifier($identifier);

      let {
        implicitClassTarget,
        in_: inParameter,
        nodeKind: nodeKindParameter,
        properties: propertiesParameter,
        shaclmateName,
        type: typeParameter,
        ...otherParameters
      } = parameters ?? {};

      let properties: (NamedNode | sh_PropertyShape)[] | undefined;
      if (propertiesParameter) {
        if (Array.isArray(propertiesParameter)) {
          properties = (propertiesParameter as NodeShapePropertyArray).map(
            (property) => {
              if (typeof property === "string") {
                return toIri(property);
              }
              return property;
            },
          );
        } else {
          properties = (
            Object.entries(propertiesParameter) as readonly [
              string,
              NodeShapePropertiesRecordValue,
            ][]
          ).map(([key, propertyParameters]) => {
            let {
              $identifier,
              path,
              name,
              shaclmateName,
              ...otherPropertyParameters
            } = propertyParameters;

            // Order of checks here is important.
            let identifierTerm: BlankNode | NamedNode;
            if ($identifier) {
              identifierTerm = toIdentifier($identifier);
            } else {
              if (nodeShapeIdentifier.termType === "NamedNode") {
                identifierTerm = dataFactory.namedNode(
                  `${nodeShapeIdentifier.value}-${key}`,
                );
              } else {
                identifierTerm = dataFactory.blankNode();
              }
            }

            if (!name && !shaclmateName) {
              name = key;
            }

            if (!path) {
              path = (defaultNamespace as NamespaceBuilder)(key);
            }

            return PropertyShape(identifierTerm, {
              ...otherPropertyParameters,
              name,
              path,
              shaclmateName,
            });
          });
        }
      }

      if (!shaclmateName && typeof $identifier === "string") {
        shaclmateName = $identifier;
      }

      let type: NamedNode[] | undefined;
      if (typeParameter) {
        type = toIriArray(typeParameter).concat();
        if (
          implicitClassTarget &&
          !type.some(
            (type) => type.equals(rdfs.Class) || type.equals(owl.Class),
          )
        ) {
          type.push(rdfs.Class);
        }
      } else if (implicitClassTarget) {
        type = [rdfs.Class];
      }

      return sh_NodeShape.createUnsafe<DefaultNamespaceT>({
        ...otherParameters,
        $defaultNamespace: defaultNamespace,
        $identifier: nodeShapeIdentifier,
        in_: convertIn(inParameter),
        nodeKind: convertNodeKind(nodeKindParameter),
        properties,
        shaclmateName,
        type,
      });
    },

    PropertyShape,
  };
}
