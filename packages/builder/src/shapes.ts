import datasetFactory from "@rdfjs/dataset";
import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { LiteralFactory } from "@rdfx/literal";
import {
  PropertyPath as RdfxResourcePropertyPath,
  type Resource,
  ResourceSet,
} from "@rdfx/resource";
import { NTriplesIdentifier, NTriplesTerm } from "@rdfx/string";
import { type Either, Left, type Maybe, Right } from "purify-ts";

export type $_ToRdfResourceFunction<
  IdentifierT extends Resource.Identifier,
  ObjectT extends { $identifier: () => IdentifierT },
> = (parameters: {
  graph: Exclude<Quad_Graph, Variable> | undefined;
  ignoreRdfType: boolean;
  object: ObjectT;
  resource: Resource<IdentifierT>;
  resourceSet: ResourceSet;
}) => void;

export type $EqualsResult = Either<$EqualsResult.Unequal, true>;

export namespace $EqualsResult {
  export const Equal: $EqualsResult = Right(true);

  export function fromBooleanEqualsResult(
    left: any,
    right: any,
    equalsResult: boolean | $EqualsResult,
  ): $EqualsResult {
    if (typeof equalsResult !== "boolean") {
      return equalsResult;
    }

    if (equalsResult) {
      return Equal;
    }

    return Left({ left, right, type: "boolean" });
  }

  export type Unequal =
    | {
        readonly left: {
          readonly array: readonly any[];
          readonly element: any;
          readonly elementIndex: number;
        };
        readonly right: {
          readonly array: readonly any[];
          readonly unequals: readonly Unequal[];
        };
        readonly type: "array-element";
      }
    | {
        readonly left: readonly any[];
        readonly right: readonly any[];
        readonly type: "array-length";
      }
    | { readonly left: any; readonly right: any; readonly type: "boolean" }
    | { readonly right: any; readonly type: "left-null" }
    | {
        readonly left: any;
        readonly right: any;
        readonly propertyName: string;
        readonly propertyValuesUnequal: Unequal;
        readonly type: "property";
      }
    | { readonly left: any; readonly type: "right-null" };
}

const $literalFactory = new LiteralFactory({ dataFactory: dataFactory });

const $parseIdentifier = NTriplesIdentifier.parser(dataFactory);

export type $PropertyPath = RdfxResourcePropertyPath;

export namespace $PropertyPath {
  export const schema: Readonly<object> = {};

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<$PropertyPath> =
    RdfxResourcePropertyPath.toResource;
}

namespace $RdfVocabularies {
  export const rdf = {
    first: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
    ),
    nil: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
    ),
    rest: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
    ),
    subject: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
    ),
    type: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    ),
  };

  export const rdfs = {
    subClassOf: dataFactory.namedNode(
      "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    ),
  };

  export const xsd = {
    boolean: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
    byte: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#byte"),
    date: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#date"),
    dateTime: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#dateTime",
    ),
    decimal: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal"),
    double: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#double"),
    float: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#float"),
    int: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#int"),
    integer: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    long: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#long"),
    negativeInteger: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#negativeInteger",
    ),
    nonNegativeInteger: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    ),
    nonPositiveInteger: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#nonPositiveInteger",
    ),
    positiveInteger: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#positiveInteger",
    ),
    short: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#short"),
    string: dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string"),
    unsignedByte: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#unsignedByte",
    ),
    unsignedInt: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#unsignedInt",
    ),
    unsignedLong: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#unsignedLong",
    ),
    unsignedShort: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#unsignedShort",
    ),
  };
}

/**
 * Compare two values for strict equality (===), returning an $EqualsResult rather than a boolean.
 */
function $strictEquals<T extends bigint | boolean | number | string>(
  left: T,
  right: T,
): $EqualsResult {
  return $EqualsResult.fromBooleanEqualsResult(left, right, left === right);
}

export type $ToRdfResourceFunction<
  ObjectT,
  IdentifierT extends Resource.Identifier = Resource.Identifier,
> = (
  object: ObjectT,
  options?: {
    graph?: Exclude<Quad_Graph, Variable>;
    ignoreRdfType?: boolean;
    resourceSet?: ResourceSet;
  },
) => Resource<IdentifierT>;

export type $ToRdfResourceValuesFunction<
  ValueT,
  ReturnT extends BlankNode | Literal | NamedNode =
    | BlankNode
    | Literal
    | NamedNode,
> = (
  value: ValueT,
  options: {
    graph?: Exclude<Quad_Graph, Variable>;
    ignoreRdfType?: boolean;
    propertyPath: $PropertyPath;
    resource: Resource;
    resourceSet: ResourceSet;
  },
) => ReturnT[];

function $wrap_ToRdfResourceFunction<
  IdentifierT extends Resource.Identifier,
  ObjectT extends { $identifier: () => IdentifierT },
>(
  _toRdfResourceFunction: $_ToRdfResourceFunction<IdentifierT, ObjectT>,
): $ToRdfResourceFunction<ObjectT, IdentifierT> {
  return (object, options) => {
    let { graph, ignoreRdfType = false, resourceSet } = options ?? {};
    if (!resourceSet) {
      resourceSet = new ResourceSet({
        dataFactory: dataFactory,
        dataset: datasetFactory.dataset(),
      });
    }
    const resource = resourceSet.resource(object.$identifier());
    _toRdfResourceFunction({
      graph,
      ignoreRdfType,
      object,
      resource,
      resourceSet,
    });
    return resource;
  };
}
export type Severity = NamedNode<
  | "http://www.w3.org/ns/shacl#Info"
  | "http://www.w3.org/ns/shacl#Warning"
  | "http://www.w3.org/ns/shacl#Violation"
>;
export type sh_NodeShape = {
  readonly $identifier: () => sh_NodeShape.Identifier;

  readonly $type: "sh_NodeShape";

  readonly and: Maybe<readonly (BlankNode | NamedNode)[]>;

  readonly classes: readonly NamedNode[];

  readonly closed: Maybe<boolean>;

  readonly comment: Maybe<string>;

  readonly datatype: Maybe<NamedNode>;

  readonly deactivated: Maybe<boolean>;

  readonly discriminantValue: Maybe<string>;

  readonly extern: Maybe<boolean>;

  readonly flags: Maybe<string>;

  readonly fromRdfType: Maybe<NamedNode>;

  readonly hasValues: readonly (NamedNode | Literal)[];

  /**
   * Whether to ignore this shape in code generation, defaults to false
   */
  readonly ignore: boolean;

  readonly ignoredProperties: Maybe<readonly NamedNode[]>;

  readonly in_: Maybe<readonly (NamedNode | Literal)[]>;

  readonly isDefinedBy: Maybe<BlankNode | NamedNode>;

  readonly label: Maybe<string>;

  readonly languageIn: Maybe<readonly string[]>;

  readonly maxExclusive: Maybe<Literal>;

  readonly maxInclusive: Maybe<Literal>;

  readonly maxLength: Maybe<bigint>;

  readonly message: Maybe<string>;

  readonly minExclusive: Maybe<Literal>;

  readonly minInclusive: Maybe<Literal>;

  readonly minLength: Maybe<bigint>;

  readonly mutable: Maybe<boolean>;

  readonly node: Maybe<BlankNode | NamedNode>;

  readonly nodeKind: Maybe<
    NamedNode<
      | "http://www.w3.org/ns/shacl#BlankNode"
      | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
      | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
      | "http://www.w3.org/ns/shacl#IRI"
      | "http://www.w3.org/ns/shacl#IRIOrLiteral"
      | "http://www.w3.org/ns/shacl#Literal"
    >
  >;

  readonly not: readonly (BlankNode | NamedNode)[];

  readonly or: Maybe<readonly (BlankNode | NamedNode)[]>;

  readonly pattern: Maybe<string>;

  readonly properties: readonly (BlankNode | NamedNode)[];

  readonly rdfType: Maybe<NamedNode>;

  readonly severity: Maybe<Severity>;

  readonly shaclmateName: Maybe<string>;

  readonly subClassOf: readonly NamedNode[];

  readonly targetClasses: readonly NamedNode[];

  readonly targetNodes: readonly (NamedNode | Literal)[];

  readonly targetObjectsOf: readonly NamedNode[];

  readonly targetSubjectsOf: readonly NamedNode[];

  readonly toRdfTypes: readonly NamedNode[];

  readonly tsImports: readonly string[];

  readonly types: readonly NamedNode[];

  readonly xone: Maybe<readonly (BlankNode | NamedNode)[]>;
};

export namespace sh_NodeShape {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_NodeShape(object: $Object): object is sh_NodeShape {
    return object.$type === "sh_NodeShape";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode("http://www.w3.org/ns/shacl#NodeShape"),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      and: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#and"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      classes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#class"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      closed: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#closed"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      comment: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#comment",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      datatype: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#datatype"),
        type: { kind: "Option" as const, itemType: { kind: "Iri" as const } },
      },
      deactivated: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#deactivated"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      discriminantValue: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#discriminantValue",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      extern: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#extern",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      flags: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#flags"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      fromRdfType: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#fromRdfType",
        ),
        type: { kind: "Option" as const, itemType: { kind: "Iri" as const } },
      },
      hasValues: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#hasValue"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      ignore: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#ignore",
        ),
        type: {
          kind: "DefaultValue" as const,
          itemType: { kind: "Boolean" as const },
          defaultValue: dataFactory.literal(
            "false",
            $RdfVocabularies.xsd.boolean,
          ),
        },
      },
      ignoredProperties: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#ignoredProperties",
        ),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Iri" as const },
          },
        },
      },
      in_: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#in"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: {
              kind: "Term" as const,
              types: ["NamedNode", "Literal"],
            },
          },
        },
      },
      isDefinedBy: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      label: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#label",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      languageIn: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#languageIn"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "String" as const },
          },
        },
      },
      maxExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      message: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#message"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      minExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      mutable: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#mutable",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      node: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#node"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      nodeKind: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#nodeKind"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "Iri" as const,
            in: [
              dataFactory.namedNode("http://www.w3.org/ns/shacl#BlankNode"),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrIRI",
              ),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrLiteral",
              ),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRI"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRIOrLiteral"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Literal"),
            ],
          },
        },
      },
      not: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#not"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      or: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#or"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      pattern: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#pattern"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      properties: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#property"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      rdfType: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#rdfType",
        ),
        type: { kind: "Option" as const, itemType: { kind: "Iri" as const } },
      },
      severity: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#severity"),
        get type() {
          return {
            kind: "Option" as const,
            get itemType() {
              return {
                kind: "Iri" as const,
                in: [
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Info"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Warning"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Violation"),
                ],
              };
            },
          };
        },
      },
      shaclmateName: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      subClassOf: {
        kind: "Shacl",
        path: $RdfVocabularies.rdfs.subClassOf,
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetClasses: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetClass"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetNodes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetNode"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      targetObjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetObjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetSubjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetSubjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      toRdfTypes: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#toRdfType",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      tsImports: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#tsImport",
        ),
        type: { kind: "Set" as const, itemType: { kind: "String" as const } },
      },
      types: {
        kind: "Shacl",
        path: $RdfVocabularies.rdf.type,
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      xone: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#xone"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
    },
    toRdfTypes: [dataFactory.namedNode("http://www.w3.org/ns/shacl#NodeShape")],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_NodeShape.Identifier,
    sh_NodeShape
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_NodeShape.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_NodeShape.schema.properties.and.path,
      parameters.object.and.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.classes.path,
      parameters.object.classes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.closed.path,
      parameters.object.closed
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.comment.path,
      parameters.object.comment
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.datatype.path,
      parameters.object.datatype.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.deactivated.path,
      parameters.object.deactivated
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.discriminantValue.path,
      parameters.object.discriminantValue
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.extern.path,
      parameters.object.extern
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.flags.path,
      parameters.object.flags
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.fromRdfType.path,
      parameters.object.fromRdfType.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.hasValues.path,
      parameters.object.hasValues.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.ignore.path,
      $strictEquals(parameters.object.ignore, false).isLeft()
        ? [
            $literalFactory.boolean(
              parameters.object.ignore,
              $RdfVocabularies.xsd.boolean,
            ),
          ]
        : [],
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.ignoredProperties.path,
      parameters.object.ignoredProperties.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.in_.path,
      parameters.object.in_.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.label.path,
      parameters.object.label
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.languageIn.path,
      parameters.object.languageIn.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [$literalFactory.string(item)],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxExclusive.path,
      parameters.object.maxExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxInclusive.path,
      parameters.object.maxInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxLength.path,
      parameters.object.maxLength
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.message.path,
      parameters.object.message
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minExclusive.path,
      parameters.object.minExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minInclusive.path,
      parameters.object.minInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minLength.path,
      parameters.object.minLength
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.mutable.path,
      parameters.object.mutable
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.node.path,
      parameters.object.node.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.nodeKind.path,
      parameters.object.nodeKind.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.not.path,
      parameters.object.not.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.or.path,
      parameters.object.or.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.pattern.path,
      parameters.object.pattern
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.properties.path,
      parameters.object.properties.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.rdfType.path,
      parameters.object.rdfType.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.severity.path,
      parameters.object.severity.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.shaclmateName.path,
      parameters.object.shaclmateName
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.subClassOf.path,
      parameters.object.subClassOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetClasses.path,
      parameters.object.targetClasses.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetNodes.path,
      parameters.object.targetNodes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetObjectsOf.path,
      parameters.object.targetObjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetSubjectsOf.path,
      parameters.object.targetSubjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.toRdfTypes.path,
      parameters.object.toRdfTypes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.tsImports.path,
      parameters.object.tsImports.flatMap((item) => [
        $literalFactory.string(item),
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.types.path,
      parameters.object.types.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.xone.path,
      parameters.object.xone.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type sh_Ontology = {
  readonly $identifier: () => sh_Ontology.Identifier;

  readonly $type: "sh_Ontology";

  readonly comment: Maybe<string>;

  readonly label: Maybe<string>;
};

export namespace sh_Ontology {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_Ontology(object: $Object): object is sh_Ontology {
    return object.$type === "sh_Ontology";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode(
      "http://www.w3.org/2002/07/owl#Ontology",
    ),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      comment: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#comment",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      label: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#label",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
    },
    toRdfTypes: [
      dataFactory.namedNode("http://www.w3.org/2002/07/owl#Ontology"),
    ],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_Ontology.Identifier,
    sh_Ontology
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_Ontology.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_NodeShape.schema.properties.comment.path,
      parameters.object.comment
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.label.path,
      parameters.object.label
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type sh_PropertyGroup = {
  readonly $identifier: () => sh_PropertyGroup.Identifier;

  readonly $type: "sh_PropertyGroup";

  readonly comment: Maybe<string>;

  readonly label: Maybe<string>;
};

export namespace sh_PropertyGroup {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_PropertyGroup(
    object: $Object,
  ): object is sh_PropertyGroup {
    return object.$type === "sh_PropertyGroup";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode(
      "http://www.w3.org/ns/shacl#PropertyGroup",
    ),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      comment: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#comment",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      label: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#label",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
    },
    toRdfTypes: [
      dataFactory.namedNode("http://www.w3.org/ns/shacl#PropertyGroup"),
    ],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_PropertyGroup.Identifier,
    sh_PropertyGroup
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_PropertyGroup.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_NodeShape.schema.properties.comment.path,
      parameters.object.comment
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.label.path,
      parameters.object.label
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type sh_PropertyShape = {
  readonly $identifier: () => sh_PropertyShape.Identifier;

  readonly $type: "sh_PropertyShape";

  readonly and: Maybe<readonly (BlankNode | NamedNode)[]>;

  readonly classes: readonly NamedNode[];

  readonly comment: Maybe<string>;

  readonly datatype: Maybe<NamedNode>;

  readonly deactivated: Maybe<boolean>;

  readonly defaultValue: Maybe<NamedNode | Literal>;

  readonly description: Maybe<string>;

  readonly disjoint: readonly NamedNode[];

  /**
   * Whether to include this property in a toString()-type display, defaults to false
   */
  readonly display: boolean;

  readonly equals: readonly NamedNode[];

  readonly flags: Maybe<string>;

  readonly groups: readonly (BlankNode | NamedNode)[];

  readonly hasValues: readonly (NamedNode | Literal)[];

  /**
   * Whether to ignore this shape in code generation, defaults to false
   */
  readonly ignore: boolean;

  readonly in_: Maybe<readonly (NamedNode | Literal)[]>;

  readonly isDefinedBy: Maybe<BlankNode | NamedNode>;

  readonly label: Maybe<string>;

  readonly languageIn: Maybe<readonly string[]>;

  readonly lessThan: readonly NamedNode[];

  readonly lessThanOrEquals: readonly NamedNode[];

  readonly maxCount: Maybe<bigint>;

  readonly maxExclusive: Maybe<Literal>;

  readonly maxInclusive: Maybe<Literal>;

  readonly maxLength: Maybe<bigint>;

  readonly message: Maybe<string>;

  readonly minCount: Maybe<bigint>;

  readonly minExclusive: Maybe<Literal>;

  readonly minInclusive: Maybe<Literal>;

  readonly minLength: Maybe<bigint>;

  readonly mutable: Maybe<boolean>;

  readonly name: Maybe<string>;

  readonly node: Maybe<BlankNode | NamedNode>;

  readonly nodeKind: Maybe<
    NamedNode<
      | "http://www.w3.org/ns/shacl#BlankNode"
      | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
      | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
      | "http://www.w3.org/ns/shacl#IRI"
      | "http://www.w3.org/ns/shacl#IRIOrLiteral"
      | "http://www.w3.org/ns/shacl#Literal"
    >
  >;

  readonly not: readonly (BlankNode | NamedNode)[];

  readonly or: Maybe<readonly (BlankNode | NamedNode)[]>;

  readonly order: Maybe<number>;

  readonly path: sh_$a$PropertyPath;

  readonly pattern: Maybe<string>;

  readonly qualifiedMaxCount: Maybe<bigint>;

  readonly qualifiedMinCount: Maybe<bigint>;

  readonly qualifiedValueShape: Maybe<BlankNode | NamedNode>;

  readonly qualifiedValueShapesDisjoint: Maybe<boolean>;

  readonly resolve: Maybe<BlankNode | NamedNode>;

  readonly severity: Maybe<Severity>;

  readonly shaclmateName: Maybe<string>;

  readonly targetClasses: readonly NamedNode[];

  readonly targetNodes: readonly (NamedNode | Literal)[];

  readonly targetObjectsOf: readonly NamedNode[];

  readonly targetSubjectsOf: readonly NamedNode[];

  readonly uniqueLang: Maybe<boolean>;

  readonly xone: Maybe<readonly (BlankNode | NamedNode)[]>;
};

export namespace sh_PropertyShape {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_PropertyShape(
    object: $Object,
  ): object is sh_PropertyShape {
    return object.$type === "sh_PropertyShape";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode(
      "http://www.w3.org/ns/shacl#PropertyShape",
    ),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      and: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#and"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      classes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#class"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      comment: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#comment",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      datatype: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#datatype"),
        type: { kind: "Option" as const, itemType: { kind: "Iri" as const } },
      },
      deactivated: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#deactivated"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      defaultValue: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#defaultValue"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      description: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#description"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      disjoint: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#disjoint"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      display: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#display",
        ),
        type: {
          kind: "DefaultValue" as const,
          itemType: { kind: "Boolean" as const },
          defaultValue: dataFactory.literal(
            "false",
            $RdfVocabularies.xsd.boolean,
          ),
        },
      },
      equals: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#equals"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      flags: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#flags"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      groups: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#group"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      hasValues: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#hasValue"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      ignore: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#ignore",
        ),
        type: {
          kind: "DefaultValue" as const,
          itemType: { kind: "Boolean" as const },
          defaultValue: dataFactory.literal(
            "false",
            $RdfVocabularies.xsd.boolean,
          ),
        },
      },
      in_: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#in"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: {
              kind: "Term" as const,
              types: ["NamedNode", "Literal"],
            },
          },
        },
      },
      isDefinedBy: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      label: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#label",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      languageIn: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#languageIn"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "String" as const },
          },
        },
      },
      lessThan: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#lessThan"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      lessThanOrEquals: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#lessThanOrEquals",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      maxCount: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxCount"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      maxExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      message: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#message"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      minCount: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minCount"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      minExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      mutable: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#mutable",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      name: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#name"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      node: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#node"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      nodeKind: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#nodeKind"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "Iri" as const,
            in: [
              dataFactory.namedNode("http://www.w3.org/ns/shacl#BlankNode"),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrIRI",
              ),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrLiteral",
              ),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRI"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRIOrLiteral"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Literal"),
            ],
          },
        },
      },
      not: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#not"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      or: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#or"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      order: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#order"),
        type: { kind: "Option" as const, itemType: { kind: "Float" as const } },
      },
      path: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#path"),
        get type() {
          return sh_$a$PropertyPath.schema;
        },
      },
      pattern: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#pattern"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      qualifiedMaxCount: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedMaxCount",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      qualifiedMinCount: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedMinCount",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      qualifiedValueShape: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedValueShape",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      qualifiedValueShapesDisjoint: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedValueShapesDisjoint",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      resolve: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#resolve",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      severity: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#severity"),
        get type() {
          return {
            kind: "Option" as const,
            get itemType() {
              return {
                kind: "Iri" as const,
                in: [
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Info"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Warning"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Violation"),
                ],
              };
            },
          };
        },
      },
      shaclmateName: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      targetClasses: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetClass"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetNodes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetNode"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      targetObjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetObjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetSubjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetSubjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      uniqueLang: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#uniqueLang"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      xone: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#xone"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
    },
    toRdfTypes: [
      dataFactory.namedNode("http://www.w3.org/ns/shacl#PropertyShape"),
    ],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_PropertyShape.Identifier,
    sh_PropertyShape
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_PropertyShape.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_NodeShape.schema.properties.and.path,
      parameters.object.and.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.classes.path,
      parameters.object.classes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.comment.path,
      parameters.object.comment
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.datatype.path,
      parameters.object.datatype.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.deactivated.path,
      parameters.object.deactivated
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.defaultValue.path,
      parameters.object.defaultValue.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.description.path,
      parameters.object.description
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.disjoint.path,
      parameters.object.disjoint.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.display.path,
      $strictEquals(parameters.object.display, false).isLeft()
        ? [
            $literalFactory.boolean(
              parameters.object.display,
              $RdfVocabularies.xsd.boolean,
            ),
          ]
        : [],
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.equals.path,
      parameters.object.equals.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.flags.path,
      parameters.object.flags
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.groups.path,
      parameters.object.groups.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.hasValues.path,
      parameters.object.hasValues.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.ignore.path,
      $strictEquals(parameters.object.ignore, false).isLeft()
        ? [
            $literalFactory.boolean(
              parameters.object.ignore,
              $RdfVocabularies.xsd.boolean,
            ),
          ]
        : [],
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.in_.path,
      parameters.object.in_.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.label.path,
      parameters.object.label
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.languageIn.path,
      parameters.object.languageIn.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [$literalFactory.string(item)],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.lessThan.path,
      parameters.object.lessThan.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.lessThanOrEquals.path,
      parameters.object.lessThanOrEquals.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.maxCount.path,
      parameters.object.maxCount
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxExclusive.path,
      parameters.object.maxExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxInclusive.path,
      parameters.object.maxInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.maxLength.path,
      parameters.object.maxLength
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.message.path,
      parameters.object.message
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.minCount.path,
      parameters.object.minCount
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minExclusive.path,
      parameters.object.minExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minInclusive.path,
      parameters.object.minInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.minLength.path,
      parameters.object.minLength
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.mutable.path,
      parameters.object.mutable
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.name.path,
      parameters.object.name
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.node.path,
      parameters.object.node.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.nodeKind.path,
      parameters.object.nodeKind.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.not.path,
      parameters.object.not.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.or.path,
      parameters.object.or.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.order.path,
      parameters.object.order
        .toList()
        .flatMap((value) => [
          $literalFactory.number(value, $RdfVocabularies.xsd.double),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.path.path,
      [
        sh_$a$PropertyPath.toRdfResource(parameters.object.path, {
          graph: parameters.graph,
          resourceSet: parameters.resourceSet,
        }).identifier,
      ],
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.pattern.path,
      parameters.object.pattern
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.qualifiedMaxCount.path,
      parameters.object.qualifiedMaxCount
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.qualifiedMinCount.path,
      parameters.object.qualifiedMinCount
        .toList()
        .flatMap((value) => [
          $literalFactory.bigint(value, $RdfVocabularies.xsd.integer),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.qualifiedValueShape.path,
      parameters.object.qualifiedValueShape.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.qualifiedValueShapesDisjoint.path,
      parameters.object.qualifiedValueShapesDisjoint
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.resolve.path,
      parameters.object.resolve.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.severity.path,
      parameters.object.severity.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.shaclmateName.path,
      parameters.object.shaclmateName
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetClasses.path,
      parameters.object.targetClasses.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetNodes.path,
      parameters.object.targetNodes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetObjectsOf.path,
      parameters.object.targetObjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.targetSubjectsOf.path,
      parameters.object.targetSubjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShape.schema.properties.uniqueLang.path,
      parameters.object.uniqueLang
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShape.schema.properties.xone.path,
      parameters.object.xone.toList().flatMap((value) => [
        value.length > 0
          ? value.reduce(
              (
                { currentSubListResource, listResource },
                item,
                itemIndex,
                list,
              ) => {
                if (itemIndex === 0) {
                  currentSubListResource = listResource;
                } else {
                  const newSubListResource = parameters.resourceSet.resource(
                    (() => dataFactory.blankNode())(),
                  );
                  currentSubListResource!.add(
                    $RdfVocabularies.rdf.rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $RdfVocabularies.rdf.first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $RdfVocabularies.rdf.rest,
                    $RdfVocabularies.rdf.nil,
                    parameters.graph,
                  );
                }

                return { currentSubListResource, listResource };
              },
              {
                currentSubListResource: null,
                listResource: parameters.resourceSet.resource(
                  (() => dataFactory.blankNode())(),
                ),
              } as {
                currentSubListResource: Resource<BlankNode> | null;
                listResource: Resource<BlankNode>;
              },
            ).listResource.identifier
          : $RdfVocabularies.rdf.nil,
      ]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type sh_ValidationReport = {
  readonly $identifier: () => sh_ValidationReport.Identifier;

  readonly $type: "sh_ValidationReport";

  readonly conforms: boolean;

  readonly results: readonly sh_ValidationResult[];

  readonly shapesGraphWellFormed: Maybe<boolean>;
};

export namespace sh_ValidationReport {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_ValidationReport(
    object: $Object,
  ): object is sh_ValidationReport {
    return object.$type === "sh_ValidationReport";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode(
      "http://www.w3.org/ns/shacl#ValidationReport",
    ),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      conforms: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#conforms"),
        type: { kind: "Boolean" as const },
      },
      results: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#result"),
        get type() {
          return {
            kind: "Set" as const,
            get itemType() {
              return sh_ValidationResult.schema;
            },
          };
        },
      },
      shapesGraphWellFormed: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#shapesGraphWellFormed",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
    },
    toRdfTypes: [
      dataFactory.namedNode("http://www.w3.org/ns/shacl#ValidationReport"),
    ],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_ValidationReport.Identifier,
    sh_ValidationReport
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_ValidationReport.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_ValidationReport.schema.properties.conforms.path,
      [
        $literalFactory.boolean(
          parameters.object.conforms,
          $RdfVocabularies.xsd.boolean,
        ),
      ],
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationReport.schema.properties.results.path,
      parameters.object.results.flatMap((item) => [
        sh_ValidationResult.toRdfResource(item, {
          graph: parameters.graph,
          resourceSet: parameters.resourceSet,
        }).identifier,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationReport.schema.properties.shapesGraphWellFormed.path,
      parameters.object.shapesGraphWellFormed
        .toList()
        .flatMap((value) => [
          $literalFactory.boolean(value, $RdfVocabularies.xsd.boolean),
        ]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type sh_ValidationResult = {
  readonly $identifier: () => sh_ValidationResult.Identifier;

  readonly $type: "sh_ValidationResult";

  readonly details: readonly (BlankNode | NamedNode | Literal)[];

  readonly focusNode: BlankNode | NamedNode | Literal;

  readonly message: Maybe<string>;

  readonly path: Maybe<sh_$a$PropertyPath>;

  readonly severity: Severity;

  readonly sourceConstraintComponent: NamedNode;

  readonly sourceShape: Maybe<BlankNode | NamedNode>;

  readonly value: Maybe<BlankNode | NamedNode | Literal>;
};

export namespace sh_ValidationResult {
  export type Identifier = BlankNode | NamedNode;

  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_ValidationResult(
    object: $Object,
  ): object is sh_ValidationResult {
    return object.$type === "sh_ValidationResult";
  }

  export const schema = {
    fromRdfType: dataFactory.namedNode(
      "http://www.w3.org/ns/shacl#ValidationResult",
    ),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      details: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#detail"),
        type: {
          kind: "Set" as const,
          itemType: {
            kind: "Term" as const,
            types: ["BlankNode", "NamedNode", "Literal"],
          },
        },
      },
      focusNode: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#focusNode"),
        type: {
          kind: "Term" as const,
          types: ["BlankNode", "NamedNode", "Literal"],
        },
      },
      message: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#resultMessage"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      path: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#resultPath"),
        get type() {
          return {
            kind: "Option" as const,
            get itemType() {
              return sh_$a$PropertyPath.schema;
            },
          };
        },
      },
      severity: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#resultSeverity",
        ),
        get type() {
          return {
            kind: "Iri" as const,
            in: [
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Info"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Warning"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Violation"),
            ],
          };
        },
      },
      sourceConstraintComponent: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#sourceConstraintComponent",
        ),
        type: { kind: "Iri" as const },
      },
      sourceShape: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#sourceShape"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      value: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#value"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "Term" as const,
            types: ["BlankNode", "NamedNode", "Literal"],
          },
        },
      },
    },
    toRdfTypes: [
      dataFactory.namedNode("http://www.w3.org/ns/shacl#ValidationResult"),
    ],
  } as const;

  export type Schema = typeof schema;

  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_ValidationResult.Identifier,
    sh_ValidationResult
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $RdfVocabularies.rdf.type,
        sh_ValidationResult.schema.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_ValidationResult.schema.properties.details.path,
      parameters.object.details.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.focusNode.path,
      [parameters.object.focusNode],
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.message.path,
      parameters.object.message
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.path.path,
      parameters.object.path.toList().flatMap((value) => [
        sh_$a$PropertyPath.toRdfResource(value, {
          graph: parameters.graph,
          resourceSet: parameters.resourceSet,
        }).identifier,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.severity.path,
      [parameters.object.severity],
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.sourceConstraintComponent.path,
      [parameters.object.sourceConstraintComponent],
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.sourceShape.path,
      parameters.object.sourceShape.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_ValidationResult.schema.properties.value.path,
      parameters.object.value.toList(),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const toRdfResource = $wrap_ToRdfResourceFunction(_toRdfResource);
}
export type Shape = sh_NodeShape | sh_PropertyShape;

export namespace Shape {
  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function isShape(object: $Object): object is Shape {
    return (
      sh_NodeShape.issh_NodeShape(object) ||
      sh_PropertyShape.issh_PropertyShape(object)
    );
  }

  export const schema = {
    kind: "ObjectUnion" as const,
    members: {
      sh_NodeShape: {
        discriminantValues: ["sh_NodeShape"],
        type: sh_NodeShape.schema,
      },
      sh_PropertyShape: {
        discriminantValues: ["sh_PropertyShape"],
        type: sh_PropertyShape.schema,
      },
    },
    properties: {
      and: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#and"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      classes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#class"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      comment: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#comment",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      datatype: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#datatype"),
        type: { kind: "Option" as const, itemType: { kind: "Iri" as const } },
      },
      deactivated: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#deactivated"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      flags: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#flags"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      hasValues: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#hasValue"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      ignore: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#ignore",
        ),
        type: {
          kind: "DefaultValue" as const,
          itemType: { kind: "Boolean" as const },
          defaultValue: dataFactory.literal(
            "false",
            $RdfVocabularies.xsd.boolean,
          ),
        },
      },
      in_: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#in"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: {
              kind: "Term" as const,
              types: ["NamedNode", "Literal"],
            },
          },
        },
      },
      isDefinedBy: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      label: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2000/01/rdf-schema#label",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      languageIn: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#languageIn"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "String" as const },
          },
        },
      },
      maxExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      maxLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      message: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#message"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      minExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minExclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minInclusive"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Literal" as const },
        },
      },
      minLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minLength"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "BigInt" as const },
        },
      },
      mutable: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#mutable",
        ),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Boolean" as const },
        },
      },
      node: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#node"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      nodeKind: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#nodeKind"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "Iri" as const,
            in: [
              dataFactory.namedNode("http://www.w3.org/ns/shacl#BlankNode"),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrIRI",
              ),
              dataFactory.namedNode(
                "http://www.w3.org/ns/shacl#BlankNodeOrLiteral",
              ),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRI"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#IRIOrLiteral"),
              dataFactory.namedNode("http://www.w3.org/ns/shacl#Literal"),
            ],
          },
        },
      },
      not: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#not"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Identifier" as const },
        },
      },
      or: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#or"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
      pattern: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#pattern"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      severity: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#severity"),
        get type() {
          return {
            kind: "Option" as const,
            get itemType() {
              return {
                kind: "Iri" as const,
                in: [
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Info"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Warning"),
                  dataFactory.namedNode("http://www.w3.org/ns/shacl#Violation"),
                ],
              };
            },
          };
        },
      },
      shaclmateName: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
      targetClasses: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetClass"),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetNodes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetNode"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "Term" as const, types: ["NamedNode", "Literal"] },
        },
      },
      targetObjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetObjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      targetSubjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetSubjectsOf",
        ),
        type: { kind: "Set" as const, itemType: { kind: "Iri" as const } },
      },
      xone: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#xone"),
        type: {
          kind: "Option" as const,
          itemType: {
            kind: "List" as const,
            itemType: { kind: "Identifier" as const },
          },
        },
      },
    },
  } as const;

  export const toRdfResource: $ToRdfResourceFunction<Shape> = (
    object,
    options,
  ) => {
    if (sh_NodeShape.issh_NodeShape(object)) {
      return sh_NodeShape.toRdfResource(object, options);
    }
    if (sh_PropertyShape.issh_PropertyShape(object)) {
      return sh_PropertyShape.toRdfResource(object, options);
    }
    throw new Error("unrecognized type");
  };

  export const toRdfResourceValues = ((
    value,
    _options,
  ): (BlankNode | NamedNode)[] => {
    if (sh_NodeShape.issh_NodeShape(value)) {
      return [
        sh_NodeShape.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_PropertyShape.issh_PropertyShape(value)) {
      return [
        sh_PropertyShape.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }

    throw new Error("unable to serialize to RDF");
  }) satisfies $ToRdfResourceValuesFunction<Shape>;
}
export type $Object =
  | sh_NodeShape
  | sh_Ontology
  | sh_PropertyGroup
  | sh_PropertyShape
  | sh_ValidationReport
  | sh_ValidationResult;

export namespace $Object {
  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export const schema = {
    kind: "ObjectUnion" as const,
    members: {
      sh_NodeShape: {
        discriminantValues: ["sh_NodeShape"],
        type: sh_NodeShape.schema,
      },
      sh_Ontology: {
        discriminantValues: ["sh_Ontology"],
        type: sh_Ontology.schema,
      },
      sh_PropertyGroup: {
        discriminantValues: ["sh_PropertyGroup"],
        type: sh_PropertyGroup.schema,
      },
      sh_PropertyShape: {
        discriminantValues: ["sh_PropertyShape"],
        type: sh_PropertyShape.schema,
      },
      sh_ValidationReport: {
        discriminantValues: ["sh_ValidationReport"],
        type: sh_ValidationReport.schema,
      },
      sh_ValidationResult: {
        discriminantValues: ["sh_ValidationResult"],
        type: sh_ValidationResult.schema,
      },
    },
    properties: {},
  } as const;

  export const toRdfResource: $ToRdfResourceFunction<$Object> = (
    object,
    options,
  ) => {
    if (sh_NodeShape.issh_NodeShape(object)) {
      return sh_NodeShape.toRdfResource(object, options);
    }
    if (sh_Ontology.issh_Ontology(object)) {
      return sh_Ontology.toRdfResource(object, options);
    }
    if (sh_PropertyGroup.issh_PropertyGroup(object)) {
      return sh_PropertyGroup.toRdfResource(object, options);
    }
    if (sh_PropertyShape.issh_PropertyShape(object)) {
      return sh_PropertyShape.toRdfResource(object, options);
    }
    if (sh_ValidationReport.issh_ValidationReport(object)) {
      return sh_ValidationReport.toRdfResource(object, options);
    }
    if (sh_ValidationResult.issh_ValidationResult(object)) {
      return sh_ValidationResult.toRdfResource(object, options);
    }
    throw new Error("unrecognized type");
  };

  export const toRdfResourceValues = ((
    value,
    _options,
  ): (BlankNode | NamedNode)[] => {
    if (sh_NodeShape.issh_NodeShape(value)) {
      return [
        sh_NodeShape.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_Ontology.issh_Ontology(value)) {
      return [
        sh_Ontology.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_PropertyGroup.issh_PropertyGroup(value)) {
      return [
        sh_PropertyGroup.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_PropertyShape.issh_PropertyShape(value)) {
      return [
        sh_PropertyShape.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_ValidationReport.issh_ValidationReport(value)) {
      return [
        sh_ValidationReport.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }
    if (sh_ValidationResult.issh_ValidationResult(value)) {
      return [
        sh_ValidationResult.toRdfResource(value, {
          graph: _options.graph,
          resourceSet: _options.resourceSet,
        }).identifier,
      ];
    }

    throw new Error("unable to serialize to RDF");
  }) satisfies $ToRdfResourceValuesFunction<$Object>;
}
