// biome-ignore-all lint/correctness/noUnusedVariables: namespace declaration merging
import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { expandIri, type NamespaceBuilder } from "@rdfx/iri";
import { LiteralFactory } from "@rdfx/literal";
import {
  PropertyPath as RdfxResourcePropertyPath,
  type Resource,
  ResourceSet,
} from "@rdfx/resource";
import { NTriplesIdentifier } from "@rdfx/string";
import { Either, Left, Maybe, Right } from "purify-ts";

export type $_ToRdfResourceFunction<
  IdentifierT extends Resource.Identifier,
  ObjectT extends object,
> = (parameters: {
  graph: Exclude<Quad_Graph, Variable> | undefined;
  ignoreRdfType: boolean;
  object: ObjectT;
  resource: Resource<IdentifierT>;
  resourceSet: ResourceSet;
}) => void;

namespace $Array {
  export function validate<ItemSchemaT, ItemValueT>(
    validateItem: $ValidationFunction<ItemSchemaT, ItemValueT>,
  ): $ValidationFunction<
    $CollectionSchema<ItemSchemaT>,
    readonly ItemValueT[]
  > {
    return (schema, valueArray) => {
      if (
        schema.minCount !== undefined &&
        valueArray.length < schema.minCount
      ) {
        return Left(
          new Error(
            `value array has length (${valueArray.length}) less than minCount (${schema.minCount})`,
          ),
        ) as Either<Error, readonly ItemValueT[]>;
      }

      return Either.sequence(
        valueArray.map((value) => validateItem(schema.itemType, value)),
      ) as Either<Error, readonly ItemValueT[]>;
    };
  }
}

namespace $BigInt {
  export const convert: $ConversionFunction<
    bigint | number | string,
    bigint
  > = (value) => Either.encase(() => BigInt(value));
}

interface $CollectionSchema<ItemSchemaT> {
  readonly itemType: ItemSchemaT;
  readonly kind: "List" | "Set";
  readonly minCount?: number;
}

/**
 * Remove undefined values from a record.
 */
function $compactRecord<KeyT extends string, ValueT extends {}>(
  record: Record<KeyT, ValueT | undefined>,
): Record<KeyT, ValueT> {
  return globalThis.Object.entries(record).reduce(
    (definedProperties, [propertyName, propertyValue]) => {
      if (propertyValue !== undefined) {
        definedProperties[propertyName as KeyT] = propertyValue as ValueT;
      }
      return definedProperties;
    },
    {} as Record<KeyT, ValueT>,
  );
}

type $ConversionFunction<
  SourceT,
  TargetT,
  DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
> = (
  source: SourceT,
  options: { defaultNamespace: DefaultNamespaceT | undefined },
) => Either<Error, TargetT>;

function $convertToIdentifierProperty<
  DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(
  identifier:
    | (() => $Identifier)
    | $Identifier
    | (keyof DefaultNamespaceT & string)
    | undefined,
  { defaultNamespace }: { defaultNamespace: DefaultNamespaceT | undefined },
): Either<Error, () => $Identifier> {
  switch (typeof identifier) {
    case "function":
      return Either.of(identifier);
    case "object": {
      const captureIdentifier = identifier;
      return Either.of(() => captureIdentifier);
    }
    case "string":
      return expandIri(identifier, {
        dataFactory: dataFactory,
        defaultNamespace,
      }).map((iri) => () => iri);
    case "undefined": {
      const captureIdentifier = dataFactory.blankNode();
      return Either.of(() => captureIdentifier);
    }
  }
}

function $convertToIri<
  DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(
  value: NamedNode | (keyof DefaultNamespaceT & string),
  { defaultNamespace }: { defaultNamespace: DefaultNamespaceT | undefined },
): Either<Error, NamedNode> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return expandIri(value, { dataFactory: dataFactory, defaultNamespace });
  }
}

function $convertToIriIdentifierProperty<
  DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
>(
  identifier:
    | (() => NamedNode)
    | NamedNode
    | (keyof DefaultNamespaceT & string),
  { defaultNamespace }: { defaultNamespace: DefaultNamespaceT | undefined },
): Either<Error, () => NamedNode> {
  switch (typeof identifier) {
    case "function":
      return Either.of(identifier);
    case "object": {
      const captureIdentifier = identifier;
      return Either.of(() => captureIdentifier);
    }
    case "string": {
      return expandIri(identifier, {
        dataFactory: dataFactory,
        defaultNamespace,
      }).map((iri) => () => iri);
    }
  }
}

function $convertToIriLiteral<IriT extends string>(
  value: IriT | NamedNode<IriT>,
  _options: { defaultNamespace: NamespaceBuilder | undefined },
): Either<Error, NamedNode<IriT>> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return Either.of(dataFactory.namedNode<IriT>(value));
  }
}

function $convertToList<
  DefaultNamespaceT extends NamespaceBuilder,
  ItemSourceT,
  ItemTargetT,
>(
  convertToItem: $ConversionFunction<
    ItemSourceT,
    ItemTargetT,
    DefaultNamespaceT
  >,
): $ConversionFunction<
  readonly ItemSourceT[],
  readonly ItemTargetT[],
  DefaultNamespaceT
> {
  return (value, options) =>
    Either.sequence(
      value.map((value) => convertToItem(value, options)),
    ) as Either<Error, readonly ItemTargetT[]>;
}

const $convertToLiteral: $ConversionFunction<
  bigint | boolean | Date | number | string | Literal,
  Literal
> = (value) => {
  if (typeof value === "object") {
    if (value instanceof Date) {
      return Either.of($literalFactory.date(value));
    }
    return Either.of(value);
  }

  return Either.of($literalFactory.primitive(value));
};

function $convertToMaybe<
  DefaultNamespaceT extends NamespaceBuilder,
  ItemSourceT,
  ItemTargetT,
>(
  convertToItem: $ConversionFunction<
    ItemSourceT,
    ItemTargetT,
    DefaultNamespaceT
  >,
): $ConversionFunction<
  ItemSourceT | Maybe<ItemTargetT> | undefined,
  Maybe<ItemTargetT>,
  DefaultNamespaceT
> {
  return (value, options) => {
    switch (typeof value) {
      case "object": {
        if (Maybe.isMaybe(value)) {
          return Either.of(value as Maybe<ItemTargetT>);
        }
        break;
      }
      case "undefined":
        return Either.of(Maybe.empty());
    }

    return convertToItem(value, options).map(Maybe.of);
  };
}

function $convertToScalarSet<
  DefaultNamespaceT extends NamespaceBuilder,
  ItemSourceT,
  ItemTargetT,
>(
  convertToItem: $ConversionFunction<
    ItemSourceT,
    ItemTargetT,
    DefaultNamespaceT
  >,
): $ConversionFunction<
  ItemSourceT | readonly ItemSourceT[] | undefined,
  readonly ItemTargetT[],
  DefaultNamespaceT
> {
  return (value, options) => {
    if (typeof value === "undefined") {
      return Either.of<Error, readonly ItemTargetT[]>(
        [] as unknown as readonly ItemTargetT[],
      );
    }
    if (Array.isArray(value)) {
      return Either.sequence(
        value.map((value) => convertToItem(value, options)),
      ) as Either<Error, readonly ItemTargetT[]>;
    }
    return convertToItem(value as ItemSourceT, options).map((value) => [
      value,
    ]) as Either<Error, readonly ItemTargetT[]>;
  };
}

function $convertWithDefaultValue<ItemSourceT, ItemTargetT>(
  convertToItem: $ConversionFunction<ItemSourceT, ItemTargetT>,
  defaultValue: ItemSourceT,
): $ConversionFunction<ItemSourceT | undefined, ItemTargetT> {
  return (value, options) => {
    if (typeof value === "undefined") {
      return convertToItem(defaultValue, options);
    }
    return convertToItem(value, options);
  };
}

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

type $Identifier = BlankNode | NamedNode;

namespace $Identifier {
  export function convert<
    DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    value: $Identifier | (keyof DefaultNamespaceT & string) | undefined,
    { defaultNamespace }: { defaultNamespace: DefaultNamespaceT | undefined },
  ): Either<Error, $Identifier> {
    switch (typeof value) {
      case "object":
        return Either.of(value);
      case "string":
        return expandIri(value, { dataFactory: dataFactory, defaultNamespace });
      case "undefined":
        return Either.of(dataFactory.blankNode());
    }
  }
}

namespace $Identifier {
  export const parse = NTriplesIdentifier.parser(dataFactory);
}

function $identityConversionFunction<T>(
  value: T,
  _options: { defaultNamespace: NamespaceBuilder | undefined },
): Either<Error, T> {
  return Either.of(value);
}

function $identityValidationFunction<T>(
  _schema: unknown,
  value: T,
): Either<Error, T> {
  return Either.of(value);
}

const $literalFactory = new LiteralFactory({ dataFactory: dataFactory });

interface $MaybeSchema<ItemSchemaT> {
  readonly itemType: ItemSchemaT;
  readonly kind: "Option";
}

function $monkeyPatchObject<T extends object>(
  obj: T,
  methods: { toJson?: (obj: T) => object; $toString?: (obj: T) => string },
): T {
  if (
    methods.toJson &&
    (!globalThis.Object.prototype.hasOwnProperty.call(obj, "toJSON") ||
      typeof (obj as any).toJSON === "function")
  ) {
    const toJsonMethod = methods.toJson;
    (obj as any).toJSON = function (this: T, _key: string) {
      return toJsonMethod(this);
    };
  }

  if (
    methods.$toString &&
    (!globalThis.Object.prototype.hasOwnProperty.call(obj, "toString") ||
      typeof (obj as any).toJSON === "function")
  ) {
    const toStringMethod = methods.$toString;
    (obj as any).toString = function (this: T) {
      return toStringMethod(this);
    };
  }

  return obj;
}

export type $ObjectTypeGuardFunction<ObjectT extends $Object> = (
  object: $Object,
) => object is ObjectT;

export function $parseIri(identifier: string): Either<Error, NamedNode> {
  return $Identifier
    .parse(identifier)
    .chain((identifier) =>
      identifier.termType === "NamedNode"
        ? Right(identifier)
        : Left(new Error("expected identifier to be NamedNode")),
    ) as Either<Error, NamedNode>;
}

export type $PropertyPath = RdfxResourcePropertyPath;

export namespace $PropertyPath {
  export const schema: Readonly<object> = {};

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    Resource.Identifier,
    $PropertyPath
  > = RdfxResourcePropertyPath.toResource;

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    $PropertyPath,
    Resource.Identifier
  > = (value, options) => [
    toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const $toString = RdfxResourcePropertyPath.toString;
}

const $rdf_first = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
);

const $rdf_nil = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
);

const $rdf_object = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#object",
);

const $rdf_predicate = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate",
);

const $rdf_Property = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
);

const $rdf_rest = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
);

const $rdf_Statement = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement",
);

const $rdf_subject = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
);

const $rdf_type = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
);

const $rdfs_Class = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#Class",
);

const $rdfs_comment = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#comment",
);

const $rdfs_domain = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#domain",
);

const $rdfs_isDefinedBy = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
);

const $rdfs_label = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#label",
);

const $rdfs_range = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#range",
);

const $rdfs_seeAlso = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#seeAlso",
);

const $rdfs_subClassOf = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#subClassOf",
);

const $rdfs_subPropertyOf = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#subPropertyOf",
);

function $sequenceRecord<T extends Record<string, unknown>>(
  record: { [K in keyof T]: Either<Error, T[K]> },
): Either<Error, T> {
  const result: { [K in keyof T]?: T[K] } = {};

  for (const key of globalThis.Object.keys(record) as Array<keyof T>) {
    const either = record[key];
    if (either.isLeft()) {
      return either as unknown as Either<Error, T>;
    }
    result[key] = either.extract() as T[typeof key];
  }

  return Right(result as T);
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
  IdentifierT extends Resource.Identifier,
  ObjectT extends object,
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

export type $ToStringFunction<T> = (value: T) => string;

export type $ToStringRecordFunction<T> = (value: T) => Record<string, string>;

function $validateMaybe<ItemSchemaT, ItemValueT>(
  validateItem: $ValidationFunction<ItemSchemaT, ItemValueT>,
) {
  return (
    schema: $MaybeSchema<ItemSchemaT>,
    valueMaybe: Maybe<ItemValueT>,
  ): Either<Error, Maybe<ItemValueT>> =>
    valueMaybe
      .map((value) =>
        validateItem(schema.itemType, value).map(() => valueMaybe),
      )
      .orDefault(Either.of(valueMaybe));
}

type $ValidationFunction<SchemaT, ValueT> = (
  schema: SchemaT,
  value: ValueT,
) => Either<Error, ValueT>;

function $wrap_ToRdfResourceFunction<
  IdentifierT extends Resource.Identifier,
  ObjectT extends { $identifier: () => IdentifierT },
>(
  _toRdfResourceFunction: $_ToRdfResourceFunction<IdentifierT, ObjectT>,
): $ToRdfResourceFunction<IdentifierT, ObjectT>;
function $wrap_ToRdfResourceFunction<
  _IdentifierT extends BlankNode,
  ObjectT extends object,
>(
  _toRdfResourceFunction: $_ToRdfResourceFunction<BlankNode, ObjectT>,
): $ToRdfResourceFunction<BlankNode, ObjectT>;
function $wrap_ToRdfResourceFunction<
  IdentifierT extends Resource.Identifier,
  ObjectT extends object & { $identifier?: () => IdentifierT },
>(
  _toRdfResourceFunction: $_ToRdfResourceFunction<IdentifierT, ObjectT>,
): $ToRdfResourceFunction<IdentifierT, ObjectT> {
  return (object, options) => {
    let { graph, ignoreRdfType = false, resourceSet } = options ?? {};
    if (!resourceSet) {
      resourceSet = new ResourceSet({
        dataFactory: dataFactory,
        dataset: datasetFactory.dataset(),
      });
    }
    const resource = (
      object.$identifier
        ? resourceSet.resource(object.$identifier())
        : resourceSet.resource(dataFactory.blankNode())
    ) as Resource<IdentifierT>;
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

const $xsd_boolean = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#boolean",
);

const $xsd_double = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#double",
);

const $xsd_int = dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#int");

const $xsd_integer = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#integer",
);

const $xsd_string = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#string",
);

export type skos_ConceptScheme = {
  readonly $identifier: () => skos_ConceptScheme.Identifier;

  readonly altLabel: readonly (string | Literal)[];

  readonly concepts: readonly (NamedNode | skos_Concept.Discriminated)[];

  readonly definition: readonly (string | Literal)[];

  readonly hiddenLabel: readonly (string | Literal)[];

  readonly notation: readonly Literal[];

  readonly prefLabel: readonly (string | Literal)[];

  readonly topConcepts: readonly (NamedNode | skos_Concept.Discriminated)[];

  readonly type: readonly NamedNode[];
};

export namespace skos_ConceptScheme {
  export const _toRdfResource: $_ToRdfResourceFunction<
    skos_ConceptScheme.Identifier,
    skos_ConceptScheme
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        skos_ConceptScheme.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.altLabel.path,
      parameters.object.altLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.altLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.concepts.path,
      parameters.object.concepts.flatMap((item) =>
        ((value, _options): NamedNode[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "skos_Concept") {
            return skos_Concept.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.concepts.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.definition.path,
      parameters.object.definition.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.definition.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.hiddenLabel.path,
      parameters.object.hiddenLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.hiddenLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.notation.path,
      parameters.object.notation.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.prefLabel.path,
      parameters.object.prefLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.prefLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.topConcepts.path,
      parameters.object.topConcepts.flatMap((item) =>
        ((value, _options): NamedNode[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "skos_Concept") {
            return skos_Concept.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.topConcepts.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<skos_ConceptScheme, "$identifier">
  > = (_skosConceptScheme) =>
    `skos_ConceptScheme(${JSON.stringify(skos_ConceptScheme.toStringRecord(_skosConceptScheme))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: skos_ConceptScheme.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, skos_ConceptScheme.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("skos_ConceptScheme" as const),
      altLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.altLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.altLabel.type,
          value,
        ),
      ),
      concepts: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | skos_Concept.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | skos_Concept.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.concepts, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.concepts.type,
          value,
        ),
      ),
      definition: $convertToScalarSet($identityConversionFunction)(
        parameters.definition,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.definition.type,
          value,
        ),
      ),
      hiddenLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.hiddenLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.hiddenLabel.type,
          value,
        ),
      ),
      notation: $convertToScalarSet($convertToLiteral)(parameters.notation, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.notation.type,
          value,
        ),
      ),
      prefLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.prefLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.prefLabel.type,
          value,
        ),
      ),
      topConcepts: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | skos_Concept.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | skos_Concept.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.topConcepts, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.topConcepts.type,
          value,
        ),
      ),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: skos_ConceptScheme.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => skos_ConceptScheme.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly altLabel?: string | Literal | readonly (string | Literal)[];
    readonly concepts?:
      | NamedNode
      | skos_Concept.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | skos_Concept.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly definition?: string | Literal | readonly (string | Literal)[];
    readonly hiddenLabel?: string | Literal | readonly (string | Literal)[];
    readonly notation?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly prefLabel?: string | Literal | readonly (string | Literal)[];
    readonly topConcepts?:
      | NamedNode
      | skos_Concept.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | skos_Concept.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: skos_ConceptScheme.CreateParameters<$DefaultNamespaceT>,
  ) => skos_ConceptScheme.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = skos_ConceptScheme & {
    readonly termType: "skos_ConceptScheme";
  };

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isskos_ConceptScheme: $ObjectTypeGuardFunction<
    skos_ConceptScheme.Discriminated
  > = (object): object is skos_ConceptScheme.Discriminated =>
    object.termType === "skos_ConceptScheme";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      $rdfType: {
        fromRdfType: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#ConceptScheme",
        ),
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode(
            "http://www.w3.org/2004/02/skos/core#ConceptScheme",
          ),
        ],
      } as const,
      altLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#altLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      concepts: {
        kind: "Shacl",
        path: {
          path: dataFactory.namedNode(
            "http://www.w3.org/2004/02/skos/core#inScheme",
          ),
          termType: "InversePath",
        },
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  skos_Concept: {
                    discriminantValues: ["skos_Concept"],
                    type: skos_Concept.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      definition: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#definition",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      hiddenLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#hiddenLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      notation: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#notation",
        ),
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      prefLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#prefLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      topConcepts: {
        kind: "Shacl",
        path: {
          path: dataFactory.namedNode(
            "http://www.w3.org/2004/02/skos/core#topConceptOf",
          ),
          termType: "InversePath",
        },
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  skos_Concept: {
                    discriminantValues: ["skos_Concept"],
                    type: skos_Concept.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    skos_ConceptScheme.Identifier,
    skos_ConceptScheme
  > = $wrap_ToRdfResourceFunction<
    skos_ConceptScheme.Identifier,
    skos_ConceptScheme
  >(skos_ConceptScheme._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    skos_ConceptScheme,
    NamedNode
  > = (value, options) => [
    skos_ConceptScheme.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<skos_ConceptScheme, "$identifier">
  > = (_skosConceptScheme) =>
    $compactRecord({
      $identifier: _skosConceptScheme.$identifier().toString(),
    });
}

export type skos_Concept = {
  readonly $identifier: () => skos_Concept.Identifier;

  readonly altLabel: readonly (string | Literal)[];

  readonly broader: readonly (NamedNode | skos_Concept.Discriminated)[];

  readonly definition: readonly (string | Literal)[];

  readonly hiddenLabel: readonly (string | Literal)[];

  readonly notation: readonly Literal[];

  readonly prefLabel: readonly (string | Literal)[];

  readonly type: readonly NamedNode[];
};

export namespace skos_Concept {
  export const _toRdfResource: $_ToRdfResourceFunction<
    skos_Concept.Identifier,
    skos_Concept
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        skos_Concept.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.altLabel.path,
      parameters.object.altLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.altLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_Concept.schema.properties.broader.path,
      parameters.object.broader.flatMap((item) =>
        ((value, _options): NamedNode[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "skos_Concept") {
            return skos_Concept.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_Concept.schema.properties.broader.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.definition.path,
      parameters.object.definition.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.definition.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.hiddenLabel.path,
      parameters.object.hiddenLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.hiddenLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.notation.path,
      parameters.object.notation.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.prefLabel.path,
      parameters.object.prefLabel.flatMap((item) =>
        ((value, _options): Literal[] => {
          if (typeof value === "string") {
            return [$literalFactory.string(value)];
          }
          if (typeof value === "object") {
            return [value];
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: skos_ConceptScheme.schema.properties.prefLabel.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<skos_Concept, "$identifier">
  > = (_skosConcept) =>
    `skos_Concept(${JSON.stringify(skos_Concept.toStringRecord(_skosConcept))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: skos_Concept.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, skos_Concept.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("skos_Concept" as const),
      altLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.altLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.altLabel.type,
          value,
        ),
      ),
      broader: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | skos_Concept.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | skos_Concept.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.broader, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_Concept.schema.properties.broader.type,
          value,
        ),
      ),
      definition: $convertToScalarSet($identityConversionFunction)(
        parameters.definition,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.definition.type,
          value,
        ),
      ),
      hiddenLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.hiddenLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.hiddenLabel.type,
          value,
        ),
      ),
      notation: $convertToScalarSet($convertToLiteral)(parameters.notation, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.notation.type,
          value,
        ),
      ),
      prefLabel: $convertToScalarSet($identityConversionFunction)(
        parameters.prefLabel,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.prefLabel.type,
          value,
        ),
      ),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: skos_Concept.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => skos_Concept.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly altLabel?: string | Literal | readonly (string | Literal)[];
    readonly broader?:
      | NamedNode
      | skos_Concept.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | skos_Concept.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly definition?: string | Literal | readonly (string | Literal)[];
    readonly hiddenLabel?: string | Literal | readonly (string | Literal)[];
    readonly notation?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly prefLabel?: string | Literal | readonly (string | Literal)[];
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: skos_Concept.CreateParameters<$DefaultNamespaceT>,
  ) => skos_Concept.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = skos_Concept & {
    readonly termType: "skos_Concept";
  };

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isskos_Concept: $ObjectTypeGuardFunction<
    skos_Concept.Discriminated
  > = (object): object is skos_Concept.Discriminated =>
    object.termType === "skos_Concept";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      $rdfType: {
        fromRdfType: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#Concept",
        ),
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode("http://www.w3.org/2004/02/skos/core#Concept"),
        ],
      } as const,
      altLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#altLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      broader: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#broader",
        ),
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  skos_Concept: {
                    discriminantValues: ["skos_Concept"],
                    type: skos_Concept.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      definition: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#definition",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      hiddenLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#hiddenLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      notation: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#notation",
        ),
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      prefLabel: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/2004/02/skos/core#prefLabel",
        ),
        type: {
          itemType: {
            kind: "DiscriminatedUnion",
            members: {
              string: {
                discriminantValues: ["string"],
                type: { datatype: $xsd_string, kind: "String" } as const,
              },
              object: {
                discriminantValues: ["object"],
                type: { kind: "LangString" } as const,
              },
            },
          } as const,
          kind: "Set",
        } as const,
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    skos_Concept.Identifier,
    skos_Concept
  > = $wrap_ToRdfResourceFunction<skos_Concept.Identifier, skos_Concept>(
    skos_Concept._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    skos_Concept,
    NamedNode
  > = (value, options) => [
    skos_Concept.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<skos_Concept, "$identifier">
  > = (_skosConcept) =>
    $compactRecord({ $identifier: _skosConcept.$identifier().toString() });
}

/**
 * Service with operations
 */
export type shaclmate_Service = {
  readonly $identifier: () => shaclmate_Service.Identifier;

  readonly comment: readonly Literal[];

  readonly label: readonly Literal[];

  /**
   * Identifier-safe name of the service
   */
  readonly name: Maybe<string>;

  /**
   * Set of operations associated with the service
   */
  readonly operations: readonly shaclmate_Operation[];
};

export namespace shaclmate_Service {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_Service.Identifier,
    shaclmate_Service
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        shaclmate_Service.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.name.path,
      parameters.object.name
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.operations.path,
      parameters.object.operations.flatMap((item) =>
        shaclmate_Operation.toRdfResourceValues(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: shaclmate_Service.schema.properties.operations.path,
        }),
      ),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Omit<shaclmate_Service, "comment" | "operations">
  > = (_shaclmateService) =>
    `shaclmate_Service(${JSON.stringify(shaclmate_Service.toStringRecord(_shaclmateService))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_Service.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_Service.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_Service" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      name: $convertToMaybe($identityConversionFunction)(parameters.name, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_Service.schema.properties.name.type,
          value,
        ),
      ),
      operations: $convertToScalarSet($identityConversionFunction)(
        parameters.operations,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.operations.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: shaclmate_Service.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_Service.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly name?: string | Maybe<string>;
    readonly operations?: shaclmate_Operation | readonly shaclmate_Operation[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_Service.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_Service.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_Service & {
    readonly termType: "shaclmate_Service";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_Service: $ObjectTypeGuardFunction<
    shaclmate_Service.Discriminated
  > = (object): object is shaclmate_Service.Discriminated =>
    object.termType === "shaclmate_Service";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      $rdfType: {
        fromRdfType: dataFactory.namedNode(
          "http://purl.org/rdfx/builder/ontology#ShaclmateService",
        ),
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode(
            "http://purl.org/rdfx/builder/ontology#ShaclmateService",
          ),
        ],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      name: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      operations: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#operation",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_Operation.schema;
            },
            kind: "Set",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_Service.Identifier,
    shaclmate_Service
  > = $wrap_ToRdfResourceFunction<
    shaclmate_Service.Identifier,
    shaclmate_Service
  >(shaclmate_Service._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_Service,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_Service.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Omit<shaclmate_Service, "comment" | "operations">
  > = (_shaclmateService) =>
    $compactRecord({
      $identifier: _shaclmateService.$identifier().toString(),
      label:
        _shaclmateService.label.length > 0
          ? `[${_shaclmateService.label.map((item) => item.toString())}]`
          : undefined,
      name: _shaclmateService.name.map((item) => item.toString()).extract(),
    });
}

export type shaclmate_OperationOutputHttpBindingContentType =
  shaclmate_OperationOutputHttpBindingContentType.Schema["in"][number];

export namespace shaclmate_OperationOutputHttpBindingContentType {
  export const schema = {
    datatype: $xsd_string,
    in: ["application/json"] as const,
    kind: "String",
  } as const;

  export type Schema = typeof schema;
}

/**
 * HTTP binding for an operation output.
 */
export type shaclmate_OperationOutputHttpBinding = {
  readonly $identifier: () => shaclmate_OperationOutputHttpBinding.Identifier;

  /**
   * HTTP result response body content type. If not specified, it's inferred from the request method and content type.
   */
  readonly contentType: Maybe<shaclmate_OperationOutputHttpBindingContentType>;
};

export namespace shaclmate_OperationOutputHttpBinding {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationOutputHttpBinding.Identifier,
    shaclmate_OperationOutputHttpBinding
  > = (parameters) => {
    parameters.resource.add(
      shaclmate_OperationOutputHttpBinding.schema.properties.contentType.path,
      parameters.object.contentType
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<shaclmate_OperationOutputHttpBinding, "$identifier">
  > = (_shaclmateOperationOutputHttpBinding) =>
    `shaclmate_OperationOutputHttpBinding(${JSON.stringify(
      shaclmate_OperationOutputHttpBinding.toStringRecord(
        _shaclmateOperationOutputHttpBinding,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationOutputHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationOutputHttpBinding.Discriminated> = (
    parameters = {},
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_OperationOutputHttpBinding" as const),
      contentType: $convertToMaybe($identityConversionFunction)(
        parameters.contentType,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_OperationOutputHttpBinding.schema.properties.contentType
            .type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: shaclmate_OperationOutputHttpBinding.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_OperationOutputHttpBinding.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly contentType?:
      | shaclmate_OperationOutputHttpBindingContentType
      | Maybe<shaclmate_OperationOutputHttpBindingContentType>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationOutputHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationOutputHttpBinding.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationOutputHttpBinding & {
    readonly termType: "shaclmate_OperationOutputHttpBinding";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationOutputHttpBinding: $ObjectTypeGuardFunction<
    shaclmate_OperationOutputHttpBinding.Discriminated
  > = (object): object is shaclmate_OperationOutputHttpBinding.Discriminated =>
    object.termType === "shaclmate_OperationOutputHttpBinding";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      contentType: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://schema.org/contentType"),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationOutputHttpBindingContentType.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationOutputHttpBinding.Identifier,
    shaclmate_OperationOutputHttpBinding
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationOutputHttpBinding.Identifier,
    shaclmate_OperationOutputHttpBinding
  >(shaclmate_OperationOutputHttpBinding._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationOutputHttpBinding,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationOutputHttpBinding.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<shaclmate_OperationOutputHttpBinding, "$identifier">
  > = (_shaclmateOperationOutputHttpBinding) =>
    $compactRecord({
      $identifier: _shaclmateOperationOutputHttpBinding
        .$identifier()
        .toString(),
    });
}

export type ShaclmateOperationOutputSpecificProperties = {
  readonly $identifier: () => ShaclmateOperationOutputSpecificProperties.Identifier;

  /**
   * HTTP binding for the operation output.
   */
  readonly httpBinding: Maybe<shaclmate_OperationOutputHttpBinding>;
};

export namespace ShaclmateOperationOutputSpecificProperties {
  export const _toRdfResource: $_ToRdfResourceFunction<
    ShaclmateOperationOutputSpecificProperties.Identifier,
    ShaclmateOperationOutputSpecificProperties
  > = (parameters) => {
    parameters.resource.add(
      ShaclmateOperationOutputSpecificProperties.schema.properties.httpBinding
        .path,
      parameters.object.httpBinding.toList().flatMap((value) =>
        shaclmate_OperationOutputHttpBinding.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath:
            ShaclmateOperationOutputSpecificProperties.schema.properties
              .httpBinding.path,
        }),
      ),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<ShaclmateOperationOutputSpecificProperties, "$identifier">
  > = (_shaclmateOperationOutputSpecificProperties) =>
    `ShaclmateOperationOutputSpecificProperties(${JSON.stringify(
      ShaclmateOperationOutputSpecificProperties.toStringRecord(
        _shaclmateOperationOutputSpecificProperties,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationOutputSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, ShaclmateOperationOutputSpecificProperties.Discriminated> =
    (parameters = {}) =>
      $sequenceRecord({
        $identifier: $convertToIdentifierProperty(parameters.$identifier, {
          defaultNamespace: parameters.$defaultNamespace,
        }),
        termType: Right("ShaclmateOperationOutputSpecificProperties" as const),
        httpBinding: $convertToMaybe($identityConversionFunction)(
          parameters.httpBinding,
          {
            defaultNamespace: parameters.$defaultNamespace,
          },
        ).chain((value) =>
          $validateMaybe($identityValidationFunction)(
            ShaclmateOperationOutputSpecificProperties.schema.properties
              .httpBinding.type,
            value,
          ),
        ),
      }).map((object) =>
        $monkeyPatchObject(object, {
          $toString: ShaclmateOperationOutputSpecificProperties.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => ShaclmateOperationOutputSpecificProperties.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly httpBinding?:
      | shaclmate_OperationOutputHttpBinding
      | Maybe<shaclmate_OperationOutputHttpBinding>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationOutputSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => ShaclmateOperationOutputSpecificProperties.Discriminated = (
    parameters,
  ) => create(parameters).unsafeCoerce();

  export type Discriminated = ShaclmateOperationOutputSpecificProperties & {
    readonly termType: "ShaclmateOperationOutputSpecificProperties";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isShaclmateOperationOutputSpecificProperties: $ObjectTypeGuardFunction<
    ShaclmateOperationOutputSpecificProperties.Discriminated
  > = (
    object,
  ): object is ShaclmateOperationOutputSpecificProperties.Discriminated =>
    object.termType === "ShaclmateOperationOutputSpecificProperties";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      httpBinding: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpBinding",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationOutputHttpBinding.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    ShaclmateOperationOutputSpecificProperties.Identifier,
    ShaclmateOperationOutputSpecificProperties
  > = $wrap_ToRdfResourceFunction<
    ShaclmateOperationOutputSpecificProperties.Identifier,
    ShaclmateOperationOutputSpecificProperties
  >(ShaclmateOperationOutputSpecificProperties._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    ShaclmateOperationOutputSpecificProperties,
    BlankNode | NamedNode
  > = (value, options) => [
    ShaclmateOperationOutputSpecificProperties.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<ShaclmateOperationOutputSpecificProperties, "$identifier">
  > = (_shaclmateOperationOutputSpecificProperties) =>
    $compactRecord({
      $identifier: _shaclmateOperationOutputSpecificProperties
        .$identifier()
        .toString(),
    });
}

export type sh_PropertyShapeSpecificProperties = {
  readonly $identifier: () => sh_PropertyShapeSpecificProperties.Identifier;

  readonly defaultValue: Maybe<NamedNode | Literal>;

  readonly description: Maybe<string>;

  readonly disjoint: readonly NamedNode[];

  /**
   * Whether to include this property in a toString()-type display, defaults to false
   */
  readonly display: boolean;

  readonly equals: readonly NamedNode[];

  readonly groups: readonly (NamedNode | sh_PropertyGroup.Discriminated)[];

  readonly lessThan: readonly NamedNode[];

  readonly lessThanOrEquals: readonly NamedNode[];

  readonly maxCount: Maybe<bigint>;

  readonly minCount: Maybe<bigint>;

  readonly name: Maybe<string>;

  readonly order: Maybe<number>;

  readonly path: $PropertyPath;

  readonly qualifiedMaxCount: Maybe<bigint>;

  readonly qualifiedMinCount: Maybe<bigint>;

  readonly qualifiedValueShape: Maybe<$Identifier>;

  readonly qualifiedValueShapesDisjoint: Maybe<boolean>;

  readonly resolve: Maybe<$Identifier>;

  readonly uniqueLang: Maybe<boolean>;
};

export namespace sh_PropertyShapeSpecificProperties {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_PropertyShapeSpecificProperties.Identifier,
    sh_PropertyShapeSpecificProperties
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        sh_PropertyShapeSpecificProperties.schema.properties.$rdfType
          .toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.defaultValue.path,
      parameters.object.defaultValue.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.description.path,
      parameters.object.description
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.disjoint.path,
      parameters.object.disjoint.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.display.path,
      $strictEquals(parameters.object.display, false).isLeft()
        ? [$literalFactory.boolean(parameters.object.display, $xsd_boolean)]
        : [],
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.equals.path,
      parameters.object.equals.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.groups.path,
      parameters.object.groups.flatMap((item) =>
        ((value, _options): (NamedNode | BlankNode)[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "sh_PropertyGroup") {
            return sh_PropertyGroup.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath:
            sh_PropertyShapeSpecificProperties.schema.properties.groups.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.lessThan.path,
      parameters.object.lessThan.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.lessThanOrEquals
        .path,
      parameters.object.lessThanOrEquals.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.maxCount.path,
      parameters.object.maxCount
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.minCount.path,
      parameters.object.minCount
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.name.path,
      parameters.object.name
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.order.path,
      parameters.object.order
        .toList()
        .flatMap((value) => [$literalFactory.number(value, $xsd_double)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.path.path,
      $PropertyPath.toRdfResourceValues(parameters.object.path, {
        ignoreRdfType: parameters.ignoreRdfType,
        graph: parameters.graph,
        resource: parameters.resource,
        resourceSet: parameters.resourceSet,
        propertyPath:
          sh_PropertyShapeSpecificProperties.schema.properties.path.path,
      }),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.qualifiedMaxCount
        .path,
      parameters.object.qualifiedMaxCount
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.qualifiedMinCount
        .path,
      parameters.object.qualifiedMinCount
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.qualifiedValueShape
        .path,
      parameters.object.qualifiedValueShape.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties
        .qualifiedValueShapesDisjoint.path,
      parameters.object.qualifiedValueShapesDisjoint
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.resolve.path,
      parameters.object.resolve.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_PropertyShapeSpecificProperties.schema.properties.uniqueLang.path,
      parameters.object.uniqueLang
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<sh_PropertyShapeSpecificProperties, "$identifier" | "name" | "path">
  > = (_shPropertyShapeSpecificProperties) =>
    `sh_PropertyShapeSpecificProperties(${JSON.stringify(
      sh_PropertyShapeSpecificProperties.toStringRecord(
        _shPropertyShapeSpecificProperties,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: sh_PropertyShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_PropertyShapeSpecificProperties.Discriminated> = (
    parameters,
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("sh_PropertyShapeSpecificProperties" as const),
      defaultValue: $convertToMaybe($identityConversionFunction)(
        parameters.defaultValue,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.defaultValue
            .type,
          value,
        ),
      ),
      description: $convertToMaybe($identityConversionFunction)(
        parameters.description,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.description.type,
          value,
        ),
      ),
      disjoint: $convertToScalarSet($convertToIri)(parameters.disjoint, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.disjoint.type,
          value,
        ),
      ),
      display: $convertWithDefaultValue($identityConversionFunction, false)(
        parameters.display,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ),
      equals: $convertToScalarSet($convertToIri)(parameters.equals, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.equals.type,
          value,
        ),
      ),
      groups: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | sh_PropertyGroup.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | sh_PropertyGroup.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.groups, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.groups.type,
          value,
        ),
      ),
      lessThan: $convertToScalarSet($convertToIri)(parameters.lessThan, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.lessThan.type,
          value,
        ),
      ),
      lessThanOrEquals: $convertToScalarSet($convertToIri)(
        parameters.lessThanOrEquals,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.lessThanOrEquals
            .type,
          value,
        ),
      ),
      maxCount: $convertToMaybe($BigInt.convert)(parameters.maxCount, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.maxCount.type,
          value,
        ),
      ),
      minCount: $convertToMaybe($BigInt.convert)(parameters.minCount, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.minCount.type,
          value,
        ),
      ),
      name: $convertToMaybe($identityConversionFunction)(parameters.name, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.name.type,
          value,
        ),
      ),
      order: $convertToMaybe($identityConversionFunction)(parameters.order, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.order.type,
          value,
        ),
      ),
      path: Either.of(parameters.path),
      qualifiedMaxCount: $convertToMaybe($BigInt.convert)(
        parameters.qualifiedMaxCount,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.qualifiedMaxCount
            .type,
          value,
        ),
      ),
      qualifiedMinCount: $convertToMaybe($BigInt.convert)(
        parameters.qualifiedMinCount,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.qualifiedMinCount
            .type,
          value,
        ),
      ),
      qualifiedValueShape: $convertToMaybe($Identifier.convert)(
        parameters.qualifiedValueShape,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties
            .qualifiedValueShape.type,
          value,
        ),
      ),
      qualifiedValueShapesDisjoint: $convertToMaybe(
        $identityConversionFunction,
      )(parameters.qualifiedValueShapesDisjoint, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties
            .qualifiedValueShapesDisjoint.type,
          value,
        ),
      ),
      resolve: $convertToMaybe($Identifier.convert)(parameters.resolve, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.resolve.type,
          value,
        ),
      ),
      uniqueLang: $convertToMaybe($identityConversionFunction)(
        parameters.uniqueLang,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShapeSpecificProperties.schema.properties.uniqueLang.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: sh_PropertyShapeSpecificProperties.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => sh_PropertyShapeSpecificProperties.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly defaultValue?: (NamedNode | Literal) | Maybe<NamedNode | Literal>;
    readonly description?: string | Maybe<string>;
    readonly disjoint?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly display?: boolean;
    readonly equals?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly groups?:
      | NamedNode
      | sh_PropertyGroup.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | sh_PropertyGroup.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly lessThan?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly lessThanOrEquals?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly maxCount?: bigint | number | string | Maybe<bigint>;
    readonly minCount?: bigint | number | string | Maybe<bigint>;
    readonly name?: string | Maybe<string>;
    readonly order?: number | Maybe<number>;
    readonly path: $PropertyPath;
    readonly qualifiedMaxCount?: bigint | number | string | Maybe<bigint>;
    readonly qualifiedMinCount?: bigint | number | string | Maybe<bigint>;
    readonly qualifiedValueShape?:
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string)
      | Maybe<$Identifier>;
    readonly qualifiedValueShapesDisjoint?: boolean | Maybe<boolean>;
    readonly resolve?:
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string)
      | Maybe<$Identifier>;
    readonly uniqueLang?: boolean | Maybe<boolean>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: sh_PropertyShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => sh_PropertyShapeSpecificProperties.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_PropertyShapeSpecificProperties & {
    readonly termType: "sh_PropertyShapeSpecificProperties";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_PropertyShapeSpecificProperties: $ObjectTypeGuardFunction<
    sh_PropertyShapeSpecificProperties.Discriminated
  > = (object): object is sh_PropertyShapeSpecificProperties.Discriminated =>
    object.termType === "sh_PropertyShapeSpecificProperties";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      $rdfType: {
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode("http://www.w3.org/ns/shacl#PropertyShape"),
        ],
      } as const,
      defaultValue: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#defaultValue"),
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Option",
        } as const,
      } as const,
      description: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#description"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      disjoint: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#disjoint"),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      display: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#display",
        ),
        type: {
          defaultValue: dataFactory.literal("false", $xsd_boolean),
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "DefaultValue",
        } as const,
      } as const,
      equals: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#equals"),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      groups: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#group"),
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  sh_PropertyGroup: {
                    discriminantValues: ["sh_PropertyGroup"],
                    type: sh_PropertyGroup.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      lessThan: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#lessThan"),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      lessThanOrEquals: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#lessThanOrEquals",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      maxCount: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxCount"),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      minCount: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minCount"),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      name: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#name"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      order: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#order"),
        type: {
          itemType: { datatype: $xsd_double, kind: "Float" } as const,
          kind: "Option",
        } as const,
      } as const,
      path: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#path"),
        get type() {
          return $PropertyPath.schema;
        },
      } as const,
      qualifiedMaxCount: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedMaxCount",
        ),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      qualifiedMinCount: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedMinCount",
        ),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      qualifiedValueShape: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedValueShape",
        ),
        type: {
          itemType: { kind: "Identifier" } as const,
          kind: "Option",
        } as const,
      } as const,
      qualifiedValueShapesDisjoint: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#qualifiedValueShapesDisjoint",
        ),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
      resolve: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#resolve",
        ),
        type: {
          itemType: { kind: "Identifier" } as const,
          kind: "Option",
        } as const,
      } as const,
      uniqueLang: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#uniqueLang"),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_PropertyShapeSpecificProperties.Identifier,
    sh_PropertyShapeSpecificProperties
  > = $wrap_ToRdfResourceFunction<
    sh_PropertyShapeSpecificProperties.Identifier,
    sh_PropertyShapeSpecificProperties
  >(sh_PropertyShapeSpecificProperties._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_PropertyShapeSpecificProperties,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_PropertyShapeSpecificProperties.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<sh_PropertyShapeSpecificProperties, "$identifier" | "name" | "path">
  > = (_shPropertyShapeSpecificProperties) =>
    $compactRecord({
      $identifier: _shPropertyShapeSpecificProperties.$identifier().toString(),
      name: _shPropertyShapeSpecificProperties.name
        .map((item) => item.toString())
        .extract(),
      path: $PropertyPath.$toString(_shPropertyShapeSpecificProperties.path),
    });
}

export type sh_BaseShape = {
  readonly $identifier: () => sh_BaseShape.Identifier;

  readonly and: Maybe<readonly (NamedNode | sh_Shape)[]>;

  readonly class_: readonly NamedNode[];

  readonly comment: readonly Literal[];

  readonly datatype: Maybe<NamedNode>;

  readonly deactivated: Maybe<boolean>;

  readonly flags: Maybe<string>;

  readonly hasValues: readonly (NamedNode | Literal)[];

  /**
   * Whether to ignore this shape in code generation, defaults to false
   */
  readonly ignore: boolean;

  readonly in_: Maybe<readonly (NamedNode | Literal)[]>;

  readonly isDefinedBy: Maybe<NamedNode>;

  readonly label: readonly Literal[];

  readonly languageIn: Maybe<readonly string[]>;

  readonly maxExclusive: Maybe<Literal>;

  readonly maxInclusive: Maybe<Literal>;

  readonly maxLength: Maybe<bigint>;

  readonly message: Maybe<string>;

  readonly minExclusive: Maybe<Literal>;

  readonly minInclusive: Maybe<Literal>;

  readonly minLength: Maybe<bigint>;

  readonly mutable: Maybe<boolean>;

  readonly node: Maybe<NamedNode | sh_NodeShape.Discriminated>;

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

  readonly not: readonly (NamedNode | sh_NodeShape.Discriminated)[];

  readonly or: Maybe<readonly (NamedNode | sh_Shape)[]>;

  readonly pattern: Maybe<string>;

  readonly severity: Maybe<sh_Severity>;

  readonly shaclmateName: Maybe<string>;

  readonly subClassOf: readonly NamedNode[];

  readonly targetClasses: readonly NamedNode[];

  readonly targetNodes: readonly (NamedNode | Literal)[];

  readonly targetObjectsOf: readonly NamedNode[];

  readonly targetSubjectsOf: readonly NamedNode[];

  readonly type: readonly NamedNode[];

  readonly xone: Maybe<readonly (NamedNode | sh_Shape)[]>;
};

export namespace sh_BaseShape {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_BaseShape.Identifier,
    sh_BaseShape
  > = (parameters) => {
    parameters.resource.add(
      sh_BaseShape.schema.properties.and.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  ((value, _options): (NamedNode | BlankNode)[] => {
                    if (value["termType"] === "NamedNode") {
                      return [value];
                    }
                    if (
                      value["termType"] === "sh_NodeShape" ||
                      value["termType"] === "sh_PropertyShape"
                    ) {
                      return sh_Shape.toRdfResourceValues(value, {
                        graph: _options.graph,
                        propertyPath: _options.propertyPath,
                        resource: _options.resource,
                        resourceSet: _options.resourceSet,
                      });
                    }

                    throw new Error("unable to serialize to RDF");
                  })(item, {
                    graph: parameters.graph,
                    propertyPath: $rdf_first,
                    resource: currentSubListResource,
                    resourceSet: parameters.resourceSet,
                  }),
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.class_.path,
      parameters.object.class_.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.datatype.path,
      parameters.object.datatype.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.deactivated.path,
      parameters.object.deactivated
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.flags.path,
      parameters.object.flags
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.hasValues.path,
      parameters.object.hasValues.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.ignore.path,
      $strictEquals(parameters.object.ignore, false).isLeft()
        ? [$literalFactory.boolean(parameters.object.ignore, $xsd_boolean)]
        : [],
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.in_.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.languageIn.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  [$literalFactory.string(item)],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.maxExclusive.path,
      parameters.object.maxExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.maxInclusive.path,
      parameters.object.maxInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.maxLength.path,
      parameters.object.maxLength
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.message.path,
      parameters.object.message
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.minExclusive.path,
      parameters.object.minExclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.minInclusive.path,
      parameters.object.minInclusive.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.minLength.path,
      parameters.object.minLength
        .toList()
        .flatMap((value) => [$literalFactory.bigint(value, $xsd_integer)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.mutable.path,
      parameters.object.mutable
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.node.path,
      parameters.object.node.toList().flatMap((value) =>
        ((value, _options): (NamedNode | BlankNode)[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "sh_NodeShape") {
            return sh_NodeShape.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: sh_BaseShape.schema.properties.node.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.nodeKind.path,
      parameters.object.nodeKind.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.not.path,
      parameters.object.not.flatMap((item) =>
        ((value, _options): (NamedNode | BlankNode)[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "sh_NodeShape") {
            return sh_NodeShape.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: sh_BaseShape.schema.properties.not.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.or.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  ((value, _options): (NamedNode | BlankNode)[] => {
                    if (value["termType"] === "NamedNode") {
                      return [value];
                    }
                    if (
                      value["termType"] === "sh_NodeShape" ||
                      value["termType"] === "sh_PropertyShape"
                    ) {
                      return sh_Shape.toRdfResourceValues(value, {
                        graph: _options.graph,
                        propertyPath: _options.propertyPath,
                        resource: _options.resource,
                        resourceSet: _options.resourceSet,
                      });
                    }

                    throw new Error("unable to serialize to RDF");
                  })(item, {
                    graph: parameters.graph,
                    propertyPath: $rdf_first,
                    resource: currentSubListResource,
                    resourceSet: parameters.resourceSet,
                  }),
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.pattern.path,
      parameters.object.pattern
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.severity.path,
      parameters.object.severity.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.shaclmateName.path,
      parameters.object.shaclmateName
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.subClassOf.path,
      parameters.object.subClassOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.targetClasses.path,
      parameters.object.targetClasses.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.targetNodes.path,
      parameters.object.targetNodes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.targetObjectsOf.path,
      parameters.object.targetObjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.targetSubjectsOf.path,
      parameters.object.targetSubjectsOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.xone.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  ((value, _options): (NamedNode | BlankNode)[] => {
                    if (value["termType"] === "NamedNode") {
                      return [value];
                    }
                    if (
                      value["termType"] === "sh_NodeShape" ||
                      value["termType"] === "sh_PropertyShape"
                    ) {
                      return sh_Shape.toRdfResourceValues(value, {
                        graph: _options.graph,
                        propertyPath: _options.propertyPath,
                        resource: _options.resource,
                        resourceSet: _options.resourceSet,
                      });
                    }

                    throw new Error("unable to serialize to RDF");
                  })(item, {
                    graph: parameters.graph,
                    propertyPath: $rdf_first,
                    resource: currentSubListResource,
                    resourceSet: parameters.resourceSet,
                  }),
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<sh_BaseShape, "$identifier" | "label" | "shaclmateName">
  > = (_shBaseShape) =>
    `sh_BaseShape(${JSON.stringify(sh_BaseShape.toStringRecord(_shBaseShape))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_BaseShape.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_BaseShape.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("sh_BaseShape" as const),
      and: $convertToMaybe(
        $convertToList(
          <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
            value: NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string),
            options: { defaultNamespace: $DefaultNamespaceT | undefined },
          ): Either<Error, NamedNode | sh_Shape> => {
            switch (typeof value) {
              case "object":
                return Either.of(value);
              case "string":
                return $convertToIri(value, options);
              default:
                value satisfies never;
                throw new Error("should never reach this point");
            }
          },
        ),
      )(parameters.and, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_BaseShape.schema.properties.and.type,
          value,
        ),
      ),
      class_: $convertToScalarSet($convertToIri)(parameters.class_, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.class_.type,
          value,
        ),
      ),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      datatype: $convertToMaybe($convertToIri)(parameters.datatype, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.datatype.type,
          value,
        ),
      ),
      deactivated: $convertToMaybe($identityConversionFunction)(
        parameters.deactivated,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.deactivated.type,
          value,
        ),
      ),
      flags: $convertToMaybe($identityConversionFunction)(parameters.flags, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.flags.type,
          value,
        ),
      ),
      hasValues: $convertToScalarSet($identityConversionFunction)(
        parameters.hasValues,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.hasValues.type,
          value,
        ),
      ),
      ignore: $convertWithDefaultValue($identityConversionFunction, false)(
        parameters.ignore,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ),
      in_: $convertToMaybe($convertToList($identityConversionFunction))(
        parameters.in_,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_BaseShape.schema.properties.in_.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIri)(parameters.isDefinedBy, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      languageIn: $convertToMaybe($convertToList($identityConversionFunction))(
        parameters.languageIn,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_BaseShape.schema.properties.languageIn.type,
          value,
        ),
      ),
      maxExclusive: $convertToMaybe($convertToLiteral)(
        parameters.maxExclusive,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.maxExclusive.type,
          value,
        ),
      ),
      maxInclusive: $convertToMaybe($convertToLiteral)(
        parameters.maxInclusive,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.maxInclusive.type,
          value,
        ),
      ),
      maxLength: $convertToMaybe($BigInt.convert)(parameters.maxLength, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.maxLength.type,
          value,
        ),
      ),
      message: $convertToMaybe($identityConversionFunction)(
        parameters.message,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.message.type,
          value,
        ),
      ),
      minExclusive: $convertToMaybe($convertToLiteral)(
        parameters.minExclusive,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.minExclusive.type,
          value,
        ),
      ),
      minInclusive: $convertToMaybe($convertToLiteral)(
        parameters.minInclusive,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.minInclusive.type,
          value,
        ),
      ),
      minLength: $convertToMaybe($BigInt.convert)(parameters.minLength, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.minLength.type,
          value,
        ),
      ),
      mutable: $convertToMaybe($identityConversionFunction)(
        parameters.mutable,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.mutable.type,
          value,
        ),
      ),
      node: $convertToMaybe(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | sh_NodeShape.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | sh_NodeShape.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.node, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.node.type,
          value,
        ),
      ),
      nodeKind: $convertToMaybe(
        $convertToIriLiteral<
          | "http://www.w3.org/ns/shacl#BlankNode"
          | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
          | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
          | "http://www.w3.org/ns/shacl#IRI"
          | "http://www.w3.org/ns/shacl#IRIOrLiteral"
          | "http://www.w3.org/ns/shacl#Literal"
        >,
      )(parameters.nodeKind, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.nodeKind.type,
          value,
        ),
      ),
      not: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | sh_NodeShape.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | sh_NodeShape.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.not, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.not.type,
          value,
        ),
      ),
      or: $convertToMaybe(
        $convertToList(
          <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
            value: NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string),
            options: { defaultNamespace: $DefaultNamespaceT | undefined },
          ): Either<Error, NamedNode | sh_Shape> => {
            switch (typeof value) {
              case "object":
                return Either.of(value);
              case "string":
                return $convertToIri(value, options);
              default:
                value satisfies never;
                throw new Error("should never reach this point");
            }
          },
        ),
      )(parameters.or, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_BaseShape.schema.properties.or.type,
          value,
        ),
      ),
      pattern: $convertToMaybe($identityConversionFunction)(
        parameters.pattern,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.pattern.type,
          value,
        ),
      ),
      severity: $convertToMaybe($convertToIriLiteral<sh_Severity["value"]>)(
        parameters.severity,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.severity.type,
          value,
        ),
      ),
      shaclmateName: $convertToMaybe($identityConversionFunction)(
        parameters.shaclmateName,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.shaclmateName.type,
          value,
        ),
      ),
      subClassOf: $convertToScalarSet($convertToIri)(parameters.subClassOf, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.subClassOf.type,
          value,
        ),
      ),
      targetClasses: $convertToScalarSet($convertToIri)(
        parameters.targetClasses,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.targetClasses.type,
          value,
        ),
      ),
      targetNodes: $convertToScalarSet($identityConversionFunction)(
        parameters.targetNodes,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.targetNodes.type,
          value,
        ),
      ),
      targetObjectsOf: $convertToScalarSet($convertToIri)(
        parameters.targetObjectsOf,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.targetObjectsOf.type,
          value,
        ),
      ),
      targetSubjectsOf: $convertToScalarSet($convertToIri)(
        parameters.targetSubjectsOf,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.targetSubjectsOf.type,
          value,
        ),
      ),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
      xone: $convertToMaybe(
        $convertToList(
          <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
            value: NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string),
            options: { defaultNamespace: $DefaultNamespaceT | undefined },
          ): Either<Error, NamedNode | sh_Shape> => {
            switch (typeof value) {
              case "object":
                return Either.of(value);
              case "string":
                return $convertToIri(value, options);
              default:
                value satisfies never;
                throw new Error("should never reach this point");
            }
          },
        ),
      )(parameters.xone, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_BaseShape.schema.properties.xone.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: sh_BaseShape.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => sh_BaseShape.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly and?:
      | readonly (NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string))[]
      | Maybe<readonly (NamedNode | sh_Shape)[]>;
    readonly class_?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly datatype?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly deactivated?: boolean | Maybe<boolean>;
    readonly flags?: string | Maybe<string>;
    readonly hasValues?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly ignore?: boolean;
    readonly in_?:
      | readonly (NamedNode | Literal)[]
      | Maybe<readonly (NamedNode | Literal)[]>;
    readonly isDefinedBy?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly languageIn?: readonly string[] | Maybe<readonly string[]>;
    readonly maxExclusive?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | Maybe<Literal>;
    readonly maxInclusive?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | Maybe<Literal>;
    readonly maxLength?: bigint | number | string | Maybe<bigint>;
    readonly message?: string | Maybe<string>;
    readonly minExclusive?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | Maybe<Literal>;
    readonly minInclusive?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | Maybe<Literal>;
    readonly minLength?: bigint | number | string | Maybe<bigint>;
    readonly mutable?: boolean | Maybe<boolean>;
    readonly node?:
      | NamedNode
      | sh_NodeShape.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | Maybe<NamedNode | sh_NodeShape.Discriminated>;
    readonly nodeKind?:
      | (
          | "http://www.w3.org/ns/shacl#BlankNode"
          | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
          | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
          | "http://www.w3.org/ns/shacl#IRI"
          | "http://www.w3.org/ns/shacl#IRIOrLiteral"
          | "http://www.w3.org/ns/shacl#Literal"
        )
      | NamedNode<
          | "http://www.w3.org/ns/shacl#BlankNode"
          | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
          | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
          | "http://www.w3.org/ns/shacl#IRI"
          | "http://www.w3.org/ns/shacl#IRIOrLiteral"
          | "http://www.w3.org/ns/shacl#Literal"
        >
      | Maybe<
          NamedNode<
            | "http://www.w3.org/ns/shacl#BlankNode"
            | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
            | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
            | "http://www.w3.org/ns/shacl#IRI"
            | "http://www.w3.org/ns/shacl#IRIOrLiteral"
            | "http://www.w3.org/ns/shacl#Literal"
          >
        >;
    readonly not?:
      | NamedNode
      | sh_NodeShape.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | sh_NodeShape.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly or?:
      | readonly (NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string))[]
      | Maybe<readonly (NamedNode | sh_Shape)[]>;
    readonly pattern?: string | Maybe<string>;
    readonly severity?: sh_Severity["value"] | sh_Severity | Maybe<sh_Severity>;
    readonly shaclmateName?: string | Maybe<string>;
    readonly subClassOf?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly targetClasses?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly targetNodes?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly targetObjectsOf?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly targetSubjectsOf?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly xone?:
      | readonly (NamedNode | sh_Shape | (keyof $DefaultNamespaceT & string))[]
      | Maybe<readonly (NamedNode | sh_Shape)[]>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_BaseShape.CreateParameters<$DefaultNamespaceT>,
  ) => sh_BaseShape.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_BaseShape & {
    readonly termType: "sh_BaseShape";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_BaseShape: $ObjectTypeGuardFunction<
    sh_BaseShape.Discriminated
  > = (object): object is sh_BaseShape.Discriminated =>
    object.termType === "sh_BaseShape";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      and: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#and"),
        get type() {
          return {
            get itemType() {
              return {
                get itemType() {
                  return {
                    kind: "DiscriminatedUnion",
                    members: {
                      NamedNode: {
                        discriminantValues: ["NamedNode"],
                        type: { kind: "Iri" } as const,
                      },
                      sh_NodeShape: {
                        discriminantValues: [
                          "sh_NodeShape",
                          "sh_PropertyShape",
                        ],
                        type: sh_Shape.schema,
                      },
                    },
                  } as const;
                },
                kind: "List",
              } as const;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      class_: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#class"),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      datatype: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#datatype"),
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      deactivated: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#deactivated"),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
      flags: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#flags"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      hasValues: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#hasValue"),
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Set",
        } as const,
      } as const,
      ignore: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#ignore",
        ),
        type: {
          defaultValue: dataFactory.literal("false", $xsd_boolean),
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "DefaultValue",
        } as const,
      } as const,
      in_: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#in"),
        type: {
          itemType: {
            itemType: {
              kind: "Term",
              types: ["NamedNode", "Literal"],
            } as const,
            kind: "List",
          } as const,
          kind: "Option",
        } as const,
      } as const,
      isDefinedBy: {
        kind: "Shacl",
        path: $rdfs_isDefinedBy,
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      languageIn: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#languageIn"),
        type: {
          itemType: {
            itemType: { datatype: $xsd_string, kind: "String" } as const,
            kind: "List",
          } as const,
          kind: "Option",
        } as const,
      } as const,
      maxExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxExclusive"),
        type: {
          itemType: { kind: "Literal" } as const,
          kind: "Option",
        } as const,
      } as const,
      maxInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxInclusive"),
        type: {
          itemType: { kind: "Literal" } as const,
          kind: "Option",
        } as const,
      } as const,
      maxLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#maxLength"),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      message: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#message"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      minExclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minExclusive"),
        type: {
          itemType: { kind: "Literal" } as const,
          kind: "Option",
        } as const,
      } as const,
      minInclusive: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minInclusive"),
        type: {
          itemType: { kind: "Literal" } as const,
          kind: "Option",
        } as const,
      } as const,
      minLength: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#minLength"),
        type: {
          itemType: { datatype: $xsd_integer, kind: "BigInt" } as const,
          kind: "Option",
        } as const,
      } as const,
      mutable: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#mutable",
        ),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
      node: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#node"),
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  sh_NodeShape: {
                    discriminantValues: ["sh_NodeShape"],
                    type: sh_NodeShape.schema,
                  },
                },
              } as const;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      nodeKind: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#nodeKind"),
        type: {
          itemType: {
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
            ] as const,
            kind: "Iri",
          } as const,
          kind: "Option",
        } as const,
      } as const,
      not: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#not"),
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  sh_NodeShape: {
                    discriminantValues: ["sh_NodeShape"],
                    type: sh_NodeShape.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      or: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#or"),
        get type() {
          return {
            get itemType() {
              return {
                get itemType() {
                  return {
                    kind: "DiscriminatedUnion",
                    members: {
                      NamedNode: {
                        discriminantValues: ["NamedNode"],
                        type: { kind: "Iri" } as const,
                      },
                      sh_NodeShape: {
                        discriminantValues: [
                          "sh_NodeShape",
                          "sh_PropertyShape",
                        ],
                        type: sh_Shape.schema,
                      },
                    },
                  } as const;
                },
                kind: "List",
              } as const;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      pattern: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#pattern"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      severity: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#severity"),
        get type() {
          return {
            get itemType() {
              return sh_Severity.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      shaclmateName: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      subClassOf: {
        kind: "Shacl",
        path: $rdfs_subClassOf,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      targetClasses: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetClass"),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      targetNodes: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#targetNode"),
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Set",
        } as const,
      } as const,
      targetObjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetObjectsOf",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      targetSubjectsOf: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#targetSubjectsOf",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      xone: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#xone"),
        get type() {
          return {
            get itemType() {
              return {
                get itemType() {
                  return {
                    kind: "DiscriminatedUnion",
                    members: {
                      NamedNode: {
                        discriminantValues: ["NamedNode"],
                        type: { kind: "Iri" } as const,
                      },
                      sh_NodeShape: {
                        discriminantValues: [
                          "sh_NodeShape",
                          "sh_PropertyShape",
                        ],
                        type: sh_Shape.schema,
                      },
                    },
                  } as const;
                },
                kind: "List",
              } as const;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_BaseShape.Identifier,
    sh_BaseShape
  > = $wrap_ToRdfResourceFunction<sh_BaseShape.Identifier, sh_BaseShape>(
    sh_BaseShape._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_BaseShape,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_BaseShape.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<sh_BaseShape, "$identifier" | "label" | "shaclmateName">
  > = (_shBaseShape) =>
    $compactRecord({
      $identifier: _shBaseShape.$identifier().toString(),
      label:
        _shBaseShape.label.length > 0
          ? `[${_shBaseShape.label.map((item) => item.toString())}]`
          : undefined,
      shaclmateName: _shBaseShape.shaclmateName
        .map((item) => item.toString())
        .extract(),
    });
}

export type sh_PropertyShape = sh_BaseShape &
  sh_PropertyShapeSpecificProperties;

export namespace sh_PropertyShape {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_PropertyShape.Identifier,
    sh_PropertyShape
  > = (parameters) => {
    sh_BaseShape._toRdfResource(parameters);
    sh_PropertyShapeSpecificProperties._toRdfResource(parameters);
  };

  export const $toString: $ToStringFunction<sh_PropertyShape> = (value) =>
    JSON.stringify([
      sh_BaseShape.$toString(value),
      sh_PropertyShapeSpecificProperties.$toString(value),
    ]);

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: sh_PropertyShape.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_PropertyShape.Discriminated> = (parameters) =>
    sh_BaseShape
      .create(parameters)
      .chain((member0) =>
        sh_PropertyShapeSpecificProperties
          .create(parameters)
          .map((member1) => ({
            ...member0,
            ...member1,
            termType: "sh_PropertyShape" as const,
          })),
      )
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_PropertyShape.$toString }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = sh_BaseShape.CreateParameters<$DefaultNamespaceT> &
    sh_PropertyShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>;

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: sh_PropertyShape.CreateParameters<$DefaultNamespaceT>,
  ) => sh_PropertyShape.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_PropertyShape & {
    readonly termType: "sh_PropertyShape";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_PropertyShape: $ObjectTypeGuardFunction<
    sh_PropertyShape.Discriminated
  > = (object): object is sh_PropertyShape.Discriminated =>
    object.termType === "sh_PropertyShape";

  export const schema = {
    kind: "ObjectIntersection",
    members: [
      sh_BaseShape.schema,
      sh_PropertyShapeSpecificProperties.schema,
    ] as const,
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_PropertyShape.Identifier,
    sh_PropertyShape
  > = $wrap_ToRdfResourceFunction<
    sh_PropertyShape.Identifier,
    sh_PropertyShape
  >(sh_PropertyShape._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_PropertyShape,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_PropertyShape.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];
}

/**
 * Result associated with an operation.
 */
export type shaclmate_OperationOutput = sh_PropertyShape &
  ShaclmateOperationOutputSpecificProperties;

export namespace shaclmate_OperationOutput {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationOutput.Identifier,
    shaclmate_OperationOutput
  > = (parameters) => {
    sh_PropertyShape._toRdfResource(parameters);
    ShaclmateOperationOutputSpecificProperties._toRdfResource(parameters);
  };

  export const $toString: $ToStringFunction<shaclmate_OperationOutput> = (
    value,
  ) =>
    JSON.stringify([
      sh_PropertyShape.$toString(value),
      ShaclmateOperationOutputSpecificProperties.$toString(value),
    ]);

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationOutput.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationOutput.Discriminated> = (parameters) =>
    sh_PropertyShape
      .create(parameters)
      .chain((member0) =>
        ShaclmateOperationOutputSpecificProperties.create(parameters).map(
          (member1) => ({
            ...member0,
            ...member1,
            termType: "shaclmate_OperationOutput" as const,
          }),
        ),
      )
      .map((object) =>
        $monkeyPatchObject(object, {
          $toString: shaclmate_OperationOutput.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = sh_PropertyShape.CreateParameters<$DefaultNamespaceT> &
    ShaclmateOperationOutputSpecificProperties.CreateParameters<$DefaultNamespaceT>;

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationOutput.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationOutput.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationOutput & {
    readonly termType: "shaclmate_OperationOutput";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationOutput: $ObjectTypeGuardFunction<
    shaclmate_OperationOutput.Discriminated
  > = (object): object is shaclmate_OperationOutput.Discriminated =>
    object.termType === "shaclmate_OperationOutput";

  export const schema = {
    kind: "ObjectIntersection",
    members: [
      sh_PropertyShape.schema,
      ShaclmateOperationOutputSpecificProperties.schema,
    ] as const,
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationOutput.Identifier,
    shaclmate_OperationOutput
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationOutput.Identifier,
    shaclmate_OperationOutput
  >(shaclmate_OperationOutput._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationOutput,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationOutput.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];
}

export type shaclmate_OperationInputHttpBindingContentType =
  shaclmate_OperationInputHttpBindingContentType.Schema["in"][number];

export namespace shaclmate_OperationInputHttpBindingContentType {
  export const schema = {
    datatype: $xsd_string,
    in: ["application/json"] as const,
    kind: "String",
  } as const;

  export type Schema = typeof schema;
}

/**
 * HTTP binding for an operation input.
 */
export type shaclmate_OperationInputHttpBinding = {
  readonly $identifier: () => shaclmate_OperationInputHttpBinding.Identifier;

  /**
   * HTTP request body content type. This should be specified if the operation has parameters that are not bound to its request URI template. If it's not specified it defaults to JSON.
   */
  readonly contentType: Maybe<shaclmate_OperationInputHttpBindingContentType>;
};

export namespace shaclmate_OperationInputHttpBinding {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationInputHttpBinding.Identifier,
    shaclmate_OperationInputHttpBinding
  > = (parameters) => {
    parameters.resource.add(
      shaclmate_OperationInputHttpBinding.schema.properties.contentType.path,
      parameters.object.contentType
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<shaclmate_OperationInputHttpBinding, "$identifier">
  > = (_shaclmateOperationInputHttpBinding) =>
    `shaclmate_OperationInputHttpBinding(${JSON.stringify(
      shaclmate_OperationInputHttpBinding.toStringRecord(
        _shaclmateOperationInputHttpBinding,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationInputHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationInputHttpBinding.Discriminated> = (
    parameters = {},
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_OperationInputHttpBinding" as const),
      contentType: $convertToMaybe($identityConversionFunction)(
        parameters.contentType,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_OperationInputHttpBinding.schema.properties.contentType
            .type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: shaclmate_OperationInputHttpBinding.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_OperationInputHttpBinding.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly contentType?:
      | shaclmate_OperationInputHttpBindingContentType
      | Maybe<shaclmate_OperationInputHttpBindingContentType>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationInputHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationInputHttpBinding.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationInputHttpBinding & {
    readonly termType: "shaclmate_OperationInputHttpBinding";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationInputHttpBinding: $ObjectTypeGuardFunction<
    shaclmate_OperationInputHttpBinding.Discriminated
  > = (object): object is shaclmate_OperationInputHttpBinding.Discriminated =>
    object.termType === "shaclmate_OperationInputHttpBinding";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      contentType: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://schema.org/encodingType"),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationInputHttpBindingContentType.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationInputHttpBinding.Identifier,
    shaclmate_OperationInputHttpBinding
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationInputHttpBinding.Identifier,
    shaclmate_OperationInputHttpBinding
  >(shaclmate_OperationInputHttpBinding._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationInputHttpBinding,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationInputHttpBinding.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<shaclmate_OperationInputHttpBinding, "$identifier">
  > = (_shaclmateOperationInputHttpBinding) =>
    $compactRecord({
      $identifier: _shaclmateOperationInputHttpBinding.$identifier().toString(),
    });
}

export type ShaclmateOperationInputSpecificProperties = {
  readonly $identifier: () => ShaclmateOperationInputSpecificProperties.Identifier;

  /**
   * HTTP binding for the operation input.
   */
  readonly httpBinding: Maybe<shaclmate_OperationInputHttpBinding>;
};

export namespace ShaclmateOperationInputSpecificProperties {
  export const _toRdfResource: $_ToRdfResourceFunction<
    ShaclmateOperationInputSpecificProperties.Identifier,
    ShaclmateOperationInputSpecificProperties
  > = (parameters) => {
    parameters.resource.add(
      ShaclmateOperationInputSpecificProperties.schema.properties.httpBinding
        .path,
      parameters.object.httpBinding.toList().flatMap((value) =>
        shaclmate_OperationInputHttpBinding.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath:
            ShaclmateOperationInputSpecificProperties.schema.properties
              .httpBinding.path,
        }),
      ),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<ShaclmateOperationInputSpecificProperties, "$identifier">
  > = (_shaclmateOperationInputSpecificProperties) =>
    `ShaclmateOperationInputSpecificProperties(${JSON.stringify(
      ShaclmateOperationInputSpecificProperties.toStringRecord(
        _shaclmateOperationInputSpecificProperties,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationInputSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, ShaclmateOperationInputSpecificProperties.Discriminated> =
    (parameters = {}) =>
      $sequenceRecord({
        $identifier: $convertToIdentifierProperty(parameters.$identifier, {
          defaultNamespace: parameters.$defaultNamespace,
        }),
        termType: Right("ShaclmateOperationInputSpecificProperties" as const),
        httpBinding: $convertToMaybe($identityConversionFunction)(
          parameters.httpBinding,
          {
            defaultNamespace: parameters.$defaultNamespace,
          },
        ).chain((value) =>
          $validateMaybe($identityValidationFunction)(
            ShaclmateOperationInputSpecificProperties.schema.properties
              .httpBinding.type,
            value,
          ),
        ),
      }).map((object) =>
        $monkeyPatchObject(object, {
          $toString: ShaclmateOperationInputSpecificProperties.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => ShaclmateOperationInputSpecificProperties.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly httpBinding?:
      | shaclmate_OperationInputHttpBinding
      | Maybe<shaclmate_OperationInputHttpBinding>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationInputSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => ShaclmateOperationInputSpecificProperties.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = ShaclmateOperationInputSpecificProperties & {
    readonly termType: "ShaclmateOperationInputSpecificProperties";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isShaclmateOperationInputSpecificProperties: $ObjectTypeGuardFunction<
    ShaclmateOperationInputSpecificProperties.Discriminated
  > = (
    object,
  ): object is ShaclmateOperationInputSpecificProperties.Discriminated =>
    object.termType === "ShaclmateOperationInputSpecificProperties";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      httpBinding: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpBinding",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationInputHttpBinding.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    ShaclmateOperationInputSpecificProperties.Identifier,
    ShaclmateOperationInputSpecificProperties
  > = $wrap_ToRdfResourceFunction<
    ShaclmateOperationInputSpecificProperties.Identifier,
    ShaclmateOperationInputSpecificProperties
  >(ShaclmateOperationInputSpecificProperties._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    ShaclmateOperationInputSpecificProperties,
    BlankNode | NamedNode
  > = (value, options) => [
    ShaclmateOperationInputSpecificProperties.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<ShaclmateOperationInputSpecificProperties, "$identifier">
  > = (_shaclmateOperationInputSpecificProperties) =>
    $compactRecord({
      $identifier: _shaclmateOperationInputSpecificProperties
        .$identifier()
        .toString(),
    });
}

export type sh_NodeShapeSpecificProperties = {
  readonly $identifier: () => sh_NodeShapeSpecificProperties.Identifier;

  readonly closed: Maybe<boolean>;

  readonly discriminantValue: Maybe<string>;

  readonly extern: Maybe<boolean>;

  readonly fromRdfType: Maybe<NamedNode>;

  readonly ignoredProperties: Maybe<readonly NamedNode[]>;

  readonly properties: readonly (NamedNode | sh_PropertyShape.Discriminated)[];

  readonly rdfType: Maybe<NamedNode>;

  readonly toRdfTypes: readonly NamedNode[];

  readonly tsImports: readonly string[];
};

export namespace sh_NodeShapeSpecificProperties {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_NodeShapeSpecificProperties.Identifier,
    sh_NodeShapeSpecificProperties
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        sh_NodeShapeSpecificProperties.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.closed.path,
      parameters.object.closed
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.discriminantValue.path,
      parameters.object.discriminantValue
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.extern.path,
      parameters.object.extern
        .toList()
        .flatMap((value) => [$literalFactory.boolean(value, $xsd_boolean)]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.fromRdfType.path,
      parameters.object.fromRdfType.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.ignoredProperties.path,
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
                    $rdf_rest,
                    newSubListResource.identifier,
                    parameters.graph,
                  );
                  currentSubListResource = newSubListResource;
                }

                currentSubListResource.add(
                  $rdf_first,
                  [item],
                  parameters.graph,
                );

                if (itemIndex + 1 === list.length) {
                  currentSubListResource.add(
                    $rdf_rest,
                    $rdf_nil,
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
          : $rdf_nil,
      ]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.properties.path,
      parameters.object.properties.flatMap((item) =>
        ((value, _options): (NamedNode | BlankNode)[] => {
          if (value["termType"] === "NamedNode") {
            return [value];
          }
          if (value["termType"] === "sh_PropertyShape") {
            return sh_PropertyShape.toRdfResourceValues(value, {
              graph: _options.graph,
              propertyPath: _options.propertyPath,
              resource: _options.resource,
              resourceSet: _options.resourceSet,
            });
          }

          throw new Error("unable to serialize to RDF");
        })(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath:
            sh_NodeShapeSpecificProperties.schema.properties.properties.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.rdfType.path,
      parameters.object.rdfType.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.toRdfTypes.path,
      parameters.object.toRdfTypes.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_NodeShapeSpecificProperties.schema.properties.tsImports.path,
      parameters.object.tsImports.flatMap((item) => [
        $literalFactory.string(item),
      ]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<sh_NodeShapeSpecificProperties, "$identifier">
  > = (_shNodeShapeSpecificProperties) =>
    `sh_NodeShapeSpecificProperties(${JSON.stringify(
      sh_NodeShapeSpecificProperties.toStringRecord(
        _shNodeShapeSpecificProperties,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_NodeShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_NodeShapeSpecificProperties.Discriminated> = (
    parameters = {},
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("sh_NodeShapeSpecificProperties" as const),
      closed: $convertToMaybe($identityConversionFunction)(parameters.closed, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.closed.type,
          value,
        ),
      ),
      discriminantValue: $convertToMaybe($identityConversionFunction)(
        parameters.discriminantValue,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.discriminantValue
            .type,
          value,
        ),
      ),
      extern: $convertToMaybe($identityConversionFunction)(parameters.extern, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.extern.type,
          value,
        ),
      ),
      fromRdfType: $convertToMaybe($convertToIri)(parameters.fromRdfType, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.fromRdfType.type,
          value,
        ),
      ),
      ignoredProperties: $convertToMaybe($convertToList($convertToIri))(
        parameters.ignoredProperties,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($Array.validate($identityValidationFunction))(
          sh_NodeShapeSpecificProperties.schema.properties.ignoredProperties
            .type,
          value,
        ),
      ),
      properties: $convertToScalarSet(
        <$DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder>(
          value:
            | NamedNode
            | sh_PropertyShape.Discriminated
            | (keyof $DefaultNamespaceT & string),
          options: { defaultNamespace: $DefaultNamespaceT | undefined },
        ): Either<Error, NamedNode | sh_PropertyShape.Discriminated> => {
          switch (typeof value) {
            case "object":
              return Either.of(value);
            case "string":
              return $convertToIri(value, options);
            default:
              value satisfies never;
              throw new Error("should never reach this point");
          }
        },
      )(parameters.properties, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.properties.type,
          value,
        ),
      ),
      rdfType: $convertToMaybe($convertToIri)(parameters.rdfType, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.rdfType.type,
          value,
        ),
      ),
      toRdfTypes: $convertToScalarSet($convertToIri)(parameters.toRdfTypes, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.toRdfTypes.type,
          value,
        ),
      ),
      tsImports: $convertToScalarSet($identityConversionFunction)(
        parameters.tsImports,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_NodeShapeSpecificProperties.schema.properties.tsImports.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: sh_NodeShapeSpecificProperties.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => sh_NodeShapeSpecificProperties.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly closed?: boolean | Maybe<boolean>;
    readonly discriminantValue?: string | Maybe<string>;
    readonly extern?: boolean | Maybe<boolean>;
    readonly fromRdfType?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly ignoredProperties?:
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[]
      | Maybe<readonly NamedNode[]>;
    readonly properties?:
      | NamedNode
      | sh_PropertyShape.Discriminated
      | (keyof $DefaultNamespaceT & string)
      | readonly (
          | NamedNode
          | sh_PropertyShape.Discriminated
          | (keyof $DefaultNamespaceT & string)
        )[];
    readonly rdfType?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly toRdfTypes?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly tsImports?: string | readonly string[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_NodeShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => sh_NodeShapeSpecificProperties.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_NodeShapeSpecificProperties & {
    readonly termType: "sh_NodeShapeSpecificProperties";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_NodeShapeSpecificProperties: $ObjectTypeGuardFunction<
    sh_NodeShapeSpecificProperties.Discriminated
  > = (object): object is sh_NodeShapeSpecificProperties.Discriminated =>
    object.termType === "sh_NodeShapeSpecificProperties";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      $rdfType: {
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode("http://www.w3.org/ns/shacl#NodeShape"),
        ],
      } as const,
      closed: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#closed"),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
      discriminantValue: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#discriminantValue",
        ),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      extern: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#extern",
        ),
        type: {
          itemType: { datatype: $xsd_boolean, kind: "Boolean" } as const,
          kind: "Option",
        } as const,
      } as const,
      fromRdfType: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#fromRdfType",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      ignoredProperties: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://www.w3.org/ns/shacl#ignoredProperties",
        ),
        type: {
          itemType: {
            itemType: { kind: "Iri" } as const,
            kind: "List",
          } as const,
          kind: "Option",
        } as const,
      } as const,
      properties: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://www.w3.org/ns/shacl#property"),
        get type() {
          return {
            get itemType() {
              return {
                kind: "DiscriminatedUnion",
                members: {
                  NamedNode: {
                    discriminantValues: ["NamedNode"],
                    type: { kind: "Iri" } as const,
                  },
                  sh_PropertyShape: {
                    discriminantValues: ["sh_PropertyShape"],
                    type: sh_PropertyShape.schema,
                  },
                },
              } as const;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      rdfType: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#rdfType",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      toRdfTypes: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#toRdfType",
        ),
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      tsImports: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#tsImport",
        ),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Set",
        } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_NodeShapeSpecificProperties.Identifier,
    sh_NodeShapeSpecificProperties
  > = $wrap_ToRdfResourceFunction<
    sh_NodeShapeSpecificProperties.Identifier,
    sh_NodeShapeSpecificProperties
  >(sh_NodeShapeSpecificProperties._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_NodeShapeSpecificProperties,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_NodeShapeSpecificProperties.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<sh_NodeShapeSpecificProperties, "$identifier">
  > = (_shNodeShapeSpecificProperties) =>
    $compactRecord({
      $identifier: _shNodeShapeSpecificProperties.$identifier().toString(),
    });
}

export type sh_NodeShape = sh_BaseShape & sh_NodeShapeSpecificProperties;

export namespace sh_NodeShape {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_NodeShape.Identifier,
    sh_NodeShape
  > = (parameters) => {
    sh_BaseShape._toRdfResource(parameters);
    sh_NodeShapeSpecificProperties._toRdfResource(parameters);
  };

  export const $toString: $ToStringFunction<sh_NodeShape> = (value) =>
    JSON.stringify([
      sh_BaseShape.$toString(value),
      sh_NodeShapeSpecificProperties.$toString(value),
    ]);

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_NodeShape.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_NodeShape.Discriminated> = (parameters) =>
    sh_BaseShape
      .create(parameters)
      .chain((member0) =>
        sh_NodeShapeSpecificProperties.create(parameters).map((member1) => ({
          ...member0,
          ...member1,
          termType: "sh_NodeShape" as const,
        })),
      )
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_NodeShape.$toString }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = sh_BaseShape.CreateParameters<$DefaultNamespaceT> &
    sh_NodeShapeSpecificProperties.CreateParameters<$DefaultNamespaceT>;

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_NodeShape.CreateParameters<$DefaultNamespaceT>,
  ) => sh_NodeShape.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_NodeShape & {
    readonly termType: "sh_NodeShape";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_NodeShape: $ObjectTypeGuardFunction<
    sh_NodeShape.Discriminated
  > = (object): object is sh_NodeShape.Discriminated =>
    object.termType === "sh_NodeShape";

  export const schema = {
    kind: "ObjectIntersection",
    members: [
      sh_BaseShape.schema,
      sh_NodeShapeSpecificProperties.schema,
    ] as const,
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_NodeShape.Identifier,
    sh_NodeShape
  > = $wrap_ToRdfResourceFunction<sh_NodeShape.Identifier, sh_NodeShape>(
    sh_NodeShape._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_NodeShape,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_NodeShape.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];
}

/**
 * Parameter associated with an operation.
 */
export type shaclmate_OperationInput = sh_NodeShape &
  ShaclmateOperationInputSpecificProperties;

export namespace shaclmate_OperationInput {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationInput.Identifier,
    shaclmate_OperationInput
  > = (parameters) => {
    sh_NodeShape._toRdfResource(parameters);
    ShaclmateOperationInputSpecificProperties._toRdfResource(parameters);
  };

  export const $toString: $ToStringFunction<shaclmate_OperationInput> = (
    value,
  ) =>
    JSON.stringify([
      sh_NodeShape.$toString(value),
      ShaclmateOperationInputSpecificProperties.$toString(value),
    ]);

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationInput.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationInput.Discriminated> = (parameters) =>
    sh_NodeShape
      .create(parameters)
      .chain((member0) =>
        ShaclmateOperationInputSpecificProperties.create(parameters).map(
          (member1) => ({
            ...member0,
            ...member1,
            termType: "shaclmate_OperationInput" as const,
          }),
        ),
      )
      .map((object) =>
        $monkeyPatchObject(object, {
          $toString: shaclmate_OperationInput.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = sh_NodeShape.CreateParameters<$DefaultNamespaceT> &
    ShaclmateOperationInputSpecificProperties.CreateParameters<$DefaultNamespaceT>;

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationInput.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationInput.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationInput & {
    readonly termType: "shaclmate_OperationInput";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationInput: $ObjectTypeGuardFunction<
    shaclmate_OperationInput.Discriminated
  > = (object): object is shaclmate_OperationInput.Discriminated =>
    object.termType === "shaclmate_OperationInput";

  export const schema = {
    kind: "ObjectIntersection",
    members: [
      sh_NodeShape.schema,
      ShaclmateOperationInputSpecificProperties.schema,
    ] as const,
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationInput.Identifier,
    shaclmate_OperationInput
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationInput.Identifier,
    shaclmate_OperationInput
  >(shaclmate_OperationInput._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationInput,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationInput.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];
}

/**
 * HTTP binding for an operation.
 */
export type shaclmate_OperationHttpBinding = {
  readonly $identifier: () => shaclmate_OperationHttpBinding.Identifier;

  /**
   * HTTP request body method. If this is not specified, it's inferred from the existence of path, query, and/or body parameters.
   */
  readonly method: Maybe<HttpMethod>;

  /**
   * HTTP result response status code. If not specified, it defaults to 200 if there is a result, 204 if not.
   */
  readonly statusCode: Maybe<HttpSuccessStatusCode>;

  /**
   * RFC 6570 URI template for the HTTP request. Variables in the template must correspond to properties of the parameter. Any other properties of the parameter are serialized into the HTTP requets body following the given/inferred content type.
   */
  readonly urlTemplate: string;
};

export namespace shaclmate_OperationHttpBinding {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationHttpBinding.Identifier,
    shaclmate_OperationHttpBinding
  > = (parameters) => {
    parameters.resource.add(
      shaclmate_OperationHttpBinding.schema.properties.method.path,
      parameters.object.method
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_OperationHttpBinding.schema.properties.statusCode.path,
      parameters.object.statusCode
        .toList()
        .flatMap((value) => [$literalFactory.number(value, $xsd_int)]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_OperationHttpBinding.schema.properties.urlTemplate.path,
      [$literalFactory.string(parameters.object.urlTemplate)],
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<shaclmate_OperationHttpBinding, "$identifier">
  > = (_shaclmateOperationHttpBinding) =>
    `shaclmate_OperationHttpBinding(${JSON.stringify(
      shaclmate_OperationHttpBinding.toStringRecord(
        _shaclmateOperationHttpBinding,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationHttpBinding.Discriminated> = (
    parameters,
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_OperationHttpBinding" as const),
      method: $convertToMaybe($identityConversionFunction)(parameters.method, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_OperationHttpBinding.schema.properties.method.type,
          value,
        ),
      ),
      statusCode: $convertToMaybe($identityConversionFunction)(
        parameters.statusCode,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_OperationHttpBinding.schema.properties.statusCode.type,
          value,
        ),
      ),
      urlTemplate: Either.of(parameters.urlTemplate),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: shaclmate_OperationHttpBinding.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_OperationHttpBinding.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly method?: HttpMethod | Maybe<HttpMethod>;
    readonly statusCode?: HttpSuccessStatusCode | Maybe<HttpSuccessStatusCode>;
    readonly urlTemplate: string;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationHttpBinding.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationHttpBinding & {
    readonly termType: "shaclmate_OperationHttpBinding";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationHttpBinding: $ObjectTypeGuardFunction<
    shaclmate_OperationHttpBinding.Discriminated
  > = (object): object is shaclmate_OperationHttpBinding.Discriminated =>
    object.termType === "shaclmate_OperationHttpBinding";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      method: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://schema.org/httpMethod"),
        get type() {
          return {
            get itemType() {
              return HttpMethod.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      statusCode: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpStatusCode",
        ),
        get type() {
          return {
            get itemType() {
              return HttpSuccessStatusCode.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      urlTemplate: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://schema.org/urlTemplate"),
        type: { datatype: $xsd_string, kind: "String" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationHttpBinding.Identifier,
    shaclmate_OperationHttpBinding
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationHttpBinding.Identifier,
    shaclmate_OperationHttpBinding
  >(shaclmate_OperationHttpBinding._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationHttpBinding,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationHttpBinding.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<shaclmate_OperationHttpBinding, "$identifier">
  > = (_shaclmateOperationHttpBinding) =>
    $compactRecord({
      $identifier: _shaclmateOperationHttpBinding.$identifier().toString(),
    });
}

/**
 * HTTP binding for an operation error.
 */
export type shaclmate_OperationErrorHttpBinding = {
  readonly $identifier: () => shaclmate_OperationErrorHttpBinding.Identifier;

  /**
   * HTTP client/server error code for the bound error.
   */
  readonly statusCode: HttpErrorStatusCode;
};

export namespace shaclmate_OperationErrorHttpBinding {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationErrorHttpBinding.Identifier,
    shaclmate_OperationErrorHttpBinding
  > = (parameters) => {
    parameters.resource.add(
      shaclmate_OperationErrorHttpBinding.schema.properties.statusCode.path,
      [$literalFactory.number(parameters.object.statusCode, $xsd_int)],
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<shaclmate_OperationErrorHttpBinding, "$identifier">
  > = (_shaclmateOperationErrorHttpBinding) =>
    `shaclmate_OperationErrorHttpBinding(${JSON.stringify(
      shaclmate_OperationErrorHttpBinding.toStringRecord(
        _shaclmateOperationErrorHttpBinding,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationErrorHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationErrorHttpBinding.Discriminated> = (
    parameters,
  ) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_OperationErrorHttpBinding" as const),
      statusCode: Either.of(parameters.statusCode),
    }).map((object) =>
      $monkeyPatchObject(object, {
        $toString: shaclmate_OperationErrorHttpBinding.$toString,
      }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_OperationErrorHttpBinding.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly statusCode: HttpErrorStatusCode;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: shaclmate_OperationErrorHttpBinding.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationErrorHttpBinding.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationErrorHttpBinding & {
    readonly termType: "shaclmate_OperationErrorHttpBinding";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationErrorHttpBinding: $ObjectTypeGuardFunction<
    shaclmate_OperationErrorHttpBinding.Discriminated
  > = (object): object is shaclmate_OperationErrorHttpBinding.Discriminated =>
    object.termType === "shaclmate_OperationErrorHttpBinding";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      statusCode: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpStatusCode",
        ),
        get type() {
          return HttpErrorStatusCode.schema;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationErrorHttpBinding.Identifier,
    shaclmate_OperationErrorHttpBinding
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationErrorHttpBinding.Identifier,
    shaclmate_OperationErrorHttpBinding
  >(shaclmate_OperationErrorHttpBinding._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationErrorHttpBinding,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationErrorHttpBinding.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<shaclmate_OperationErrorHttpBinding, "$identifier">
  > = (_shaclmateOperationErrorHttpBinding) =>
    $compactRecord({
      $identifier: _shaclmateOperationErrorHttpBinding.$identifier().toString(),
    });
}

export type ShaclmateOperationErrorSpecificProperties = {
  readonly $identifier: () => ShaclmateOperationErrorSpecificProperties.Identifier;

  /**
   * HTTP binding for the operation error.
   */
  readonly httpBinding: Maybe<shaclmate_OperationErrorHttpBinding>;
};

export namespace ShaclmateOperationErrorSpecificProperties {
  export const _toRdfResource: $_ToRdfResourceFunction<
    ShaclmateOperationErrorSpecificProperties.Identifier,
    ShaclmateOperationErrorSpecificProperties
  > = (parameters) => {
    parameters.resource.add(
      ShaclmateOperationErrorSpecificProperties.schema.properties.httpBinding
        .path,
      parameters.object.httpBinding.toList().flatMap((value) =>
        shaclmate_OperationErrorHttpBinding.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath:
            ShaclmateOperationErrorSpecificProperties.schema.properties
              .httpBinding.path,
        }),
      ),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<ShaclmateOperationErrorSpecificProperties, "$identifier">
  > = (_shaclmateOperationErrorSpecificProperties) =>
    `ShaclmateOperationErrorSpecificProperties(${JSON.stringify(
      ShaclmateOperationErrorSpecificProperties.toStringRecord(
        _shaclmateOperationErrorSpecificProperties,
      ),
    )})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationErrorSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, ShaclmateOperationErrorSpecificProperties.Discriminated> =
    (parameters = {}) =>
      $sequenceRecord({
        $identifier: $convertToIdentifierProperty(parameters.$identifier, {
          defaultNamespace: parameters.$defaultNamespace,
        }),
        termType: Right("ShaclmateOperationErrorSpecificProperties" as const),
        httpBinding: $convertToMaybe($identityConversionFunction)(
          parameters.httpBinding,
          {
            defaultNamespace: parameters.$defaultNamespace,
          },
        ).chain((value) =>
          $validateMaybe($identityValidationFunction)(
            ShaclmateOperationErrorSpecificProperties.schema.properties
              .httpBinding.type,
            value,
          ),
        ),
      }).map((object) =>
        $monkeyPatchObject(object, {
          $toString: ShaclmateOperationErrorSpecificProperties.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => ShaclmateOperationErrorSpecificProperties.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly httpBinding?:
      | shaclmate_OperationErrorHttpBinding
      | Maybe<shaclmate_OperationErrorHttpBinding>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: ShaclmateOperationErrorSpecificProperties.CreateParameters<$DefaultNamespaceT>,
  ) => ShaclmateOperationErrorSpecificProperties.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = ShaclmateOperationErrorSpecificProperties & {
    readonly termType: "ShaclmateOperationErrorSpecificProperties";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isShaclmateOperationErrorSpecificProperties: $ObjectTypeGuardFunction<
    ShaclmateOperationErrorSpecificProperties.Discriminated
  > = (
    object,
  ): object is ShaclmateOperationErrorSpecificProperties.Discriminated =>
    object.termType === "ShaclmateOperationErrorSpecificProperties";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      httpBinding: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpBinding",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationErrorHttpBinding.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    ShaclmateOperationErrorSpecificProperties.Identifier,
    ShaclmateOperationErrorSpecificProperties
  > = $wrap_ToRdfResourceFunction<
    ShaclmateOperationErrorSpecificProperties.Identifier,
    ShaclmateOperationErrorSpecificProperties
  >(ShaclmateOperationErrorSpecificProperties._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    ShaclmateOperationErrorSpecificProperties,
    BlankNode | NamedNode
  > = (value, options) => [
    ShaclmateOperationErrorSpecificProperties.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<ShaclmateOperationErrorSpecificProperties, "$identifier">
  > = (_shaclmateOperationErrorSpecificProperties) =>
    $compactRecord({
      $identifier: _shaclmateOperationErrorSpecificProperties
        .$identifier()
        .toString(),
    });
}

/**
 * Error type associated with an operation. Must be a struct type (i.e., have at least one sh:property).
 */
export type shaclmate_OperationError = sh_NodeShape &
  ShaclmateOperationErrorSpecificProperties;

export namespace shaclmate_OperationError {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_OperationError.Identifier,
    shaclmate_OperationError
  > = (parameters) => {
    sh_NodeShape._toRdfResource(parameters);
    ShaclmateOperationErrorSpecificProperties._toRdfResource(parameters);
  };

  export const $toString: $ToStringFunction<shaclmate_OperationError> = (
    value,
  ) =>
    JSON.stringify([
      sh_NodeShape.$toString(value),
      ShaclmateOperationErrorSpecificProperties.$toString(value),
    ]);

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationError.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_OperationError.Discriminated> = (parameters) =>
    sh_NodeShape
      .create(parameters)
      .chain((member0) =>
        ShaclmateOperationErrorSpecificProperties.create(parameters).map(
          (member1) => ({
            ...member0,
            ...member1,
            termType: "shaclmate_OperationError" as const,
          }),
        ),
      )
      .map((object) =>
        $monkeyPatchObject(object, {
          $toString: shaclmate_OperationError.$toString,
        }),
      );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = sh_NodeShape.CreateParameters<$DefaultNamespaceT> &
    ShaclmateOperationErrorSpecificProperties.CreateParameters<$DefaultNamespaceT>;

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_OperationError.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_OperationError.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_OperationError & {
    readonly termType: "shaclmate_OperationError";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_OperationError: $ObjectTypeGuardFunction<
    shaclmate_OperationError.Discriminated
  > = (object): object is shaclmate_OperationError.Discriminated =>
    object.termType === "shaclmate_OperationError";

  export const schema = {
    kind: "ObjectIntersection",
    members: [
      sh_NodeShape.schema,
      ShaclmateOperationErrorSpecificProperties.schema,
    ] as const,
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_OperationError.Identifier,
    shaclmate_OperationError
  > = $wrap_ToRdfResourceFunction<
    shaclmate_OperationError.Identifier,
    shaclmate_OperationError
  >(shaclmate_OperationError._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_OperationError,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_OperationError.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];
}

/**
 * Service operation.
 */
export type shaclmate_Operation = {
  readonly $identifier: () => shaclmate_Operation.Identifier;

  readonly comment: readonly Literal[];

  /**
   * Error types associated with the operation.
   */
  readonly errors: readonly shaclmate_OperationError[];

  /**
   * HTTP binding for the operation.
   */
  readonly httpBinding: Maybe<shaclmate_OperationHttpBinding>;

  /**
   * Optional operation input type.
   */
  readonly input: Maybe<shaclmate_OperationInput>;

  readonly label: readonly Literal[];

  /**
   * Identifier-safe name of the operation, incorporated into generated code.
   */
  readonly name: Maybe<string>;

  /**
   * Optional operation output type.
   */
  readonly output: Maybe<shaclmate_OperationOutput>;
};

export namespace shaclmate_Operation {
  export const _toRdfResource: $_ToRdfResourceFunction<
    shaclmate_Operation.Identifier,
    shaclmate_Operation
  > = (parameters) => {
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Operation.schema.properties.errors.path,
      parameters.object.errors.flatMap((item) =>
        shaclmate_OperationError.toRdfResourceValues(item, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: shaclmate_Operation.schema.properties.errors.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Operation.schema.properties.httpBinding.path,
      parameters.object.httpBinding.toList().flatMap((value) =>
        shaclmate_OperationHttpBinding.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: shaclmate_Operation.schema.properties.httpBinding.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Operation.schema.properties.input.path,
      parameters.object.input.toList().flatMap((value) =>
        shaclmate_OperationInput.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: shaclmate_Operation.schema.properties.input.path,
        }),
      ),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Operation.schema.properties.name.path,
      parameters.object.name
        .toList()
        .flatMap((value) => [$literalFactory.string(value)]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Operation.schema.properties.output.path,
      parameters.object.output.toList().flatMap((value) =>
        shaclmate_OperationOutput.toRdfResourceValues(value, {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: shaclmate_Operation.schema.properties.output.path,
        }),
      ),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<shaclmate_Operation, "$identifier" | "label" | "name">
  > = (_shaclmateOperation) =>
    `shaclmate_Operation(${JSON.stringify(shaclmate_Operation.toStringRecord(_shaclmateOperation))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_Operation.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, shaclmate_Operation.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("shaclmate_Operation" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      errors: $convertToScalarSet($identityConversionFunction)(
        parameters.errors,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Operation.schema.properties.errors.type,
          value,
        ),
      ),
      httpBinding: $convertToMaybe($identityConversionFunction)(
        parameters.httpBinding,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_Operation.schema.properties.httpBinding.type,
          value,
        ),
      ),
      input: $convertToMaybe($identityConversionFunction)(parameters.input, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_Operation.schema.properties.input.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      name: $convertToMaybe($identityConversionFunction)(parameters.name, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_Operation.schema.properties.name.type,
          value,
        ),
      ),
      output: $convertToMaybe($identityConversionFunction)(parameters.output, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          shaclmate_Operation.schema.properties.output.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: shaclmate_Operation.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => shaclmate_Operation.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly errors?:
      | shaclmate_OperationError
      | readonly shaclmate_OperationError[];
    readonly httpBinding?:
      | shaclmate_OperationHttpBinding
      | Maybe<shaclmate_OperationHttpBinding>;
    readonly input?: shaclmate_OperationInput | Maybe<shaclmate_OperationInput>;
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly name?: string | Maybe<string>;
    readonly output?:
      | shaclmate_OperationOutput
      | Maybe<shaclmate_OperationOutput>;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: shaclmate_Operation.CreateParameters<$DefaultNamespaceT>,
  ) => shaclmate_Operation.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = shaclmate_Operation & {
    readonly termType: "shaclmate_Operation";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isshaclmate_Operation: $ObjectTypeGuardFunction<
    shaclmate_Operation.Discriminated
  > = (object): object is shaclmate_Operation.Discriminated =>
    object.termType === "shaclmate_Operation";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      errors: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#error"),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationError.schema;
            },
            kind: "Set",
          } as const;
        },
      } as const,
      httpBinding: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#httpBinding",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationHttpBinding.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      input: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#input"),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationInput.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      name: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
        type: {
          itemType: { datatype: $xsd_string, kind: "String" } as const,
          kind: "Option",
        } as const,
      } as const,
      output: {
        kind: "Shacl",
        path: dataFactory.namedNode(
          "http://purl.org/shaclmate/ontology#output",
        ),
        get type() {
          return {
            get itemType() {
              return shaclmate_OperationOutput.schema;
            },
            kind: "Option",
          } as const;
        },
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    shaclmate_Operation.Identifier,
    shaclmate_Operation
  > = $wrap_ToRdfResourceFunction<
    shaclmate_Operation.Identifier,
    shaclmate_Operation
  >(shaclmate_Operation._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    shaclmate_Operation,
    BlankNode | NamedNode
  > = (value, options) => [
    shaclmate_Operation.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<shaclmate_Operation, "$identifier" | "label" | "name">
  > = (_shaclmateOperation) =>
    $compactRecord({
      $identifier: _shaclmateOperation.$identifier().toString(),
      label:
        _shaclmateOperation.label.length > 0
          ? `[${_shaclmateOperation.label.map((item) => item.toString())}]`
          : undefined,
      name: _shaclmateOperation.name.map((item) => item.toString()).extract(),
    });
}

export type sh_Shape =
  | sh_NodeShape.Discriminated
  | sh_PropertyShape.Discriminated;

export namespace sh_Shape {
  export const $toString: $ToStringFunction<sh_Shape> = (value) => {
    if (value["termType"] === "sh_NodeShape") {
      return sh_NodeShape.$toString(value);
    }
    if (value["termType"] === "sh_PropertyShape") {
      return sh_PropertyShape.$toString(value);
    }

    throw new Error("unable to serialize to string");
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_Shape: $ObjectTypeGuardFunction<sh_Shape> = (
    object,
  ): object is sh_Shape =>
    sh_NodeShape.issh_NodeShape(object) ||
    sh_PropertyShape.issh_PropertyShape(object);

  export const schema = {
    kind: "ObjectDiscriminatedUnion",
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
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_Shape.Identifier,
    sh_Shape
  > = (object, options) => {
    if (sh_NodeShape.issh_NodeShape(object)) {
      return sh_NodeShape.toRdfResource(object, options);
    }
    if (sh_PropertyShape.issh_PropertyShape(object)) {
      return sh_PropertyShape.toRdfResource(object, options);
    }
    throw new Error("unrecognized type");
  };

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_Shape,
    BlankNode | NamedNode
  > = (value, _options): (BlankNode | NamedNode)[] => {
    if (value["termType"] === "sh_NodeShape") {
      return sh_NodeShape.toRdfResourceValues(value, {
        graph: _options.graph,
        propertyPath: _options.propertyPath,
        resource: _options.resource,
        resourceSet: _options.resourceSet,
      });
    }
    if (value["termType"] === "sh_PropertyShape") {
      return sh_PropertyShape.toRdfResourceValues(value, {
        graph: _options.graph,
        propertyPath: _options.propertyPath,
        resource: _options.resource,
        resourceSet: _options.resourceSet,
      });
    }

    throw new Error("unable to serialize to RDF");
  };
}

export type sh_Severity = NamedNode<
  (typeof sh_Severity.schema)["inValues"][number]
>;

export namespace sh_Severity {
  const inValues = [
    "http://www.w3.org/ns/shacl#Info",
    "http://www.w3.org/ns/shacl#Warning",
    "http://www.w3.org/ns/shacl#Violation",
  ] as const;

  export const schema = {
    in: inValues.map((inValue) => dataFactory.namedNode(inValue)),
    inValues,
    kind: "Iri",
  } as const;

  export type Schema = typeof schema;
}

export type sh_PropertyGroup = {
  readonly $identifier: () => sh_PropertyGroup.Identifier;

  readonly comment: readonly Literal[];

  readonly label: readonly Literal[];
};

export namespace sh_PropertyGroup {
  export const _toRdfResource: $_ToRdfResourceFunction<
    sh_PropertyGroup.Identifier,
    sh_PropertyGroup
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        sh_PropertyGroup.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Omit<sh_PropertyGroup, "comment">
  > = (_shPropertyGroup) =>
    `sh_PropertyGroup(${JSON.stringify(sh_PropertyGroup.toStringRecord(_shPropertyGroup))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_PropertyGroup.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, sh_PropertyGroup.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("sh_PropertyGroup" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: sh_PropertyGroup.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => sh_PropertyGroup.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters?: sh_PropertyGroup.CreateParameters<$DefaultNamespaceT>,
  ) => sh_PropertyGroup.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = sh_PropertyGroup & {
    readonly termType: "sh_PropertyGroup";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const issh_PropertyGroup: $ObjectTypeGuardFunction<
    sh_PropertyGroup.Discriminated
  > = (object): object is sh_PropertyGroup.Discriminated =>
    object.termType === "sh_PropertyGroup";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      $rdfType: {
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode("http://www.w3.org/ns/shacl#PropertyGroup"),
        ],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    sh_PropertyGroup.Identifier,
    sh_PropertyGroup
  > = $wrap_ToRdfResourceFunction<
    sh_PropertyGroup.Identifier,
    sh_PropertyGroup
  >(sh_PropertyGroup._toRdfResource);

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    sh_PropertyGroup,
    BlankNode | NamedNode
  > = (value, options) => [
    sh_PropertyGroup.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Omit<sh_PropertyGroup, "comment">
  > = (_shPropertyGroup) =>
    $compactRecord({
      $identifier: _shPropertyGroup.$identifier().toString(),
      label:
        _shPropertyGroup.label.length > 0
          ? `[${_shPropertyGroup.label.map((item) => item.toString())}]`
          : undefined,
    });
}

export type rdfs_Class = {
  readonly $identifier: () => rdfs_Class.Identifier;

  readonly comment: readonly Literal[];

  readonly isDefinedBy: Maybe<NamedNode>;

  readonly label: readonly Literal[];

  readonly seeAlso: readonly (NamedNode | Literal)[];

  readonly subClassOf: readonly NamedNode[];

  readonly type: readonly NamedNode[];
};

export namespace rdfs_Class {
  export const _toRdfResource: $_ToRdfResourceFunction<
    rdfs_Class.Identifier,
    rdfs_Class
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        rdfs_Class.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdfs_Class.schema.properties.seeAlso.path,
      parameters.object.seeAlso.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.subClassOf.path,
      parameters.object.subClassOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<rdfs_Class, "$identifier" | "label">
  > = (_rdfsClass) =>
    `rdfs_Class(${JSON.stringify(rdfs_Class.toStringRecord(_rdfsClass))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdfs_Class.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, rdfs_Class.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("rdfs_Class" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIri)(parameters.isDefinedBy, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      seeAlso: $convertToScalarSet($identityConversionFunction)(
        parameters.seeAlso,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdfs_Class.schema.properties.seeAlso.type,
          value,
        ),
      ),
      subClassOf: $convertToScalarSet($convertToIri)(parameters.subClassOf, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          sh_BaseShape.schema.properties.subClassOf.type,
          value,
        ),
      ),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: rdfs_Class.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => rdfs_Class.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly isDefinedBy?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly seeAlso?: (NamedNode | Literal) | readonly (NamedNode | Literal)[];
    readonly subClassOf?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdfs_Class.CreateParameters<$DefaultNamespaceT>,
  ) => rdfs_Class.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = rdfs_Class & { readonly termType: "rdfs_Class" };

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isrdfs_Class: $ObjectTypeGuardFunction<
    rdfs_Class.Discriminated
  > = (object): object is rdfs_Class.Discriminated =>
    object.termType === "rdfs_Class";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      $rdfType: {
        fromRdfType: $rdfs_Class,
        kind: "RdfType",
        toRdfTypes: [$rdfs_Class],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      isDefinedBy: {
        kind: "Shacl",
        path: $rdfs_isDefinedBy,
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      seeAlso: {
        kind: "Shacl",
        path: $rdfs_seeAlso,
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Set",
        } as const,
      } as const,
      subClassOf: {
        kind: "Shacl",
        path: $rdfs_subClassOf,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    rdfs_Class.Identifier,
    rdfs_Class
  > = $wrap_ToRdfResourceFunction<rdfs_Class.Identifier, rdfs_Class>(
    rdfs_Class._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    rdfs_Class,
    NamedNode
  > = (value, options) => [
    rdfs_Class.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<rdfs_Class, "$identifier" | "label">
  > = (_rdfsClass) =>
    $compactRecord({
      $identifier: _rdfsClass.$identifier().toString(),
      label:
        _rdfsClass.label.length > 0
          ? `[${_rdfsClass.label.map((item) => item.toString())}]`
          : undefined,
    });
}

export type rdf_Statement = {
  readonly $identifier: () => rdf_Statement.Identifier;

  readonly comment: readonly Literal[];

  readonly isDefinedBy: Maybe<NamedNode>;

  readonly label: readonly Literal[];

  readonly object: BlankNode | NamedNode | Literal;

  readonly predicate: NamedNode;

  readonly seeAlso: readonly (NamedNode | Literal)[];

  readonly subject: BlankNode | NamedNode | Literal;

  readonly type: readonly NamedNode[];
};

export namespace rdf_Statement {
  export const _toRdfResource: $_ToRdfResourceFunction<
    rdf_Statement.Identifier,
    rdf_Statement
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        rdf_Statement.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Statement.schema.properties.object.path,
      [parameters.object.object],
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Statement.schema.properties.predicate.path,
      [parameters.object.predicate],
      parameters.graph,
    );
    parameters.resource.add(
      rdfs_Class.schema.properties.seeAlso.path,
      parameters.object.seeAlso.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Statement.schema.properties.subject.path,
      [parameters.object.subject],
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<rdf_Statement, "$identifier" | "label">
  > = (_rdfStatement) =>
    `rdf_Statement(${JSON.stringify(rdf_Statement.toStringRecord(_rdfStatement))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdf_Statement.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, rdf_Statement.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("rdf_Statement" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIri)(parameters.isDefinedBy, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      object: Either.of(parameters.object),
      predicate: $convertToIri(parameters.predicate, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      seeAlso: $convertToScalarSet($identityConversionFunction)(
        parameters.seeAlso,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdfs_Class.schema.properties.seeAlso.type,
          value,
        ),
      ),
      subject: Either.of(parameters.subject),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: rdf_Statement.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => rdf_Statement.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly isDefinedBy?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly object: BlankNode | NamedNode | Literal;
    readonly predicate: (keyof $DefaultNamespaceT & string) | NamedNode;
    readonly seeAlso?: (NamedNode | Literal) | readonly (NamedNode | Literal)[];
    readonly subject: BlankNode | NamedNode | Literal;
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdf_Statement.CreateParameters<$DefaultNamespaceT>,
  ) => rdf_Statement.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = rdf_Statement & {
    readonly termType: "rdf_Statement";
  };

  export type Identifier = $Identifier;
  export namespace Identifier {
    export const parse = $Identifier.parse;
  }

  export const isrdf_Statement: $ObjectTypeGuardFunction<
    rdf_Statement.Discriminated
  > = (object): object is rdf_Statement.Discriminated =>
    object.termType === "rdf_Statement";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      $rdfType: {
        fromRdfType: $rdf_Statement,
        kind: "RdfType",
        toRdfTypes: [$rdf_Statement],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      isDefinedBy: {
        kind: "Shacl",
        path: $rdfs_isDefinedBy,
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      object: {
        kind: "Shacl",
        path: $rdf_object,
        type: {
          kind: "Term",
          types: ["BlankNode", "NamedNode", "Literal"],
        } as const,
      } as const,
      predicate: {
        kind: "Shacl",
        path: $rdf_predicate,
        type: { kind: "Iri" } as const,
      } as const,
      seeAlso: {
        kind: "Shacl",
        path: $rdfs_seeAlso,
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Set",
        } as const,
      } as const,
      subject: {
        kind: "Shacl",
        path: $rdf_subject,
        type: {
          kind: "Term",
          types: ["BlankNode", "NamedNode", "Literal"],
        } as const,
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    rdf_Statement.Identifier,
    rdf_Statement
  > = $wrap_ToRdfResourceFunction<rdf_Statement.Identifier, rdf_Statement>(
    rdf_Statement._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    rdf_Statement,
    BlankNode | NamedNode
  > = (value, options) => [
    rdf_Statement.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<rdf_Statement, "$identifier" | "label">
  > = (_rdfStatement) =>
    $compactRecord({
      $identifier: _rdfStatement.$identifier().toString(),
      label:
        _rdfStatement.label.length > 0
          ? `[${_rdfStatement.label.map((item) => item.toString())}]`
          : undefined,
    });
}

export type rdf_Property = {
  readonly $identifier: () => rdf_Property.Identifier;

  readonly comment: readonly Literal[];

  readonly domain: readonly NamedNode[];

  readonly isDefinedBy: Maybe<NamedNode>;

  readonly label: readonly Literal[];

  readonly range: readonly NamedNode[];

  readonly seeAlso: readonly (NamedNode | Literal)[];

  readonly subPropertyOf: readonly NamedNode[];

  readonly type: readonly NamedNode[];
};

export namespace rdf_Property {
  export const _toRdfResource: $_ToRdfResourceFunction<
    rdf_Property.Identifier,
    rdf_Property
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        rdf_Property.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Property.schema.properties.domain.path,
      parameters.object.domain.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      sh_BaseShape.schema.properties.isDefinedBy.path,
      parameters.object.isDefinedBy.toList(),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Property.schema.properties.range.path,
      parameters.object.range.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdfs_Class.schema.properties.seeAlso.path,
      parameters.object.seeAlso.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      rdf_Property.schema.properties.subPropertyOf.path,
      parameters.object.subPropertyOf.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      skos_ConceptScheme.schema.properties.type.path,
      parameters.object.type.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<
    Pick<rdf_Property, "$identifier" | "label">
  > = (_rdfProperty) =>
    `rdf_Property(${JSON.stringify(rdf_Property.toStringRecord(_rdfProperty))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdf_Property.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, rdf_Property.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("rdf_Property" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      domain: $convertToScalarSet($convertToIri)(parameters.domain, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdf_Property.schema.properties.domain.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIri)(parameters.isDefinedBy, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_BaseShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
      range: $convertToScalarSet($convertToIri)(parameters.range, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdf_Property.schema.properties.range.type,
          value,
        ),
      ),
      seeAlso: $convertToScalarSet($identityConversionFunction)(
        parameters.seeAlso,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdfs_Class.schema.properties.seeAlso.type,
          value,
        ),
      ),
      subPropertyOf: $convertToScalarSet($convertToIri)(
        parameters.subPropertyOf,
        {
          defaultNamespace: parameters.$defaultNamespace,
        },
      ).chain((value) =>
        $Array.validate($identityValidationFunction)(
          rdf_Property.schema.properties.subPropertyOf.type,
          value,
        ),
      ),
      type: $convertToScalarSet($convertToIri)(parameters.type, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          skos_ConceptScheme.schema.properties.type.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: rdf_Property.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => rdf_Property.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly domain?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly isDefinedBy?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | Maybe<NamedNode>;
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly range?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly seeAlso?: (NamedNode | Literal) | readonly (NamedNode | Literal)[];
    readonly subPropertyOf?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
    readonly type?:
      | (keyof $DefaultNamespaceT & string)
      | NamedNode
      | readonly ((keyof $DefaultNamespaceT & string) | NamedNode)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: rdf_Property.CreateParameters<$DefaultNamespaceT>,
  ) => rdf_Property.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = rdf_Property & {
    readonly termType: "rdf_Property";
  };

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isrdf_Property: $ObjectTypeGuardFunction<
    rdf_Property.Discriminated
  > = (object): object is rdf_Property.Discriminated =>
    object.termType === "rdf_Property";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      $rdfType: {
        fromRdfType: $rdf_Property,
        kind: "RdfType",
        toRdfTypes: [$rdf_Property],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      domain: {
        kind: "Shacl",
        path: $rdfs_domain,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      isDefinedBy: {
        kind: "Shacl",
        path: $rdfs_isDefinedBy,
        type: { itemType: { kind: "Iri" } as const, kind: "Option" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      range: {
        kind: "Shacl",
        path: $rdfs_range,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      seeAlso: {
        kind: "Shacl",
        path: $rdfs_seeAlso,
        type: {
          itemType: { kind: "Term", types: ["NamedNode", "Literal"] } as const,
          kind: "Set",
        } as const,
      } as const,
      subPropertyOf: {
        kind: "Shacl",
        path: $rdfs_subPropertyOf,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
      type: {
        kind: "Shacl",
        path: $rdf_type,
        type: { itemType: { kind: "Iri" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    rdf_Property.Identifier,
    rdf_Property
  > = $wrap_ToRdfResourceFunction<rdf_Property.Identifier, rdf_Property>(
    rdf_Property._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    rdf_Property,
    NamedNode
  > = (value, options) => [
    rdf_Property.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<rdf_Property, "$identifier" | "label">
  > = (_rdfProperty) =>
    $compactRecord({
      $identifier: _rdfProperty.$identifier().toString(),
      label:
        _rdfProperty.label.length > 0
          ? `[${_rdfProperty.label.map((item) => item.toString())}]`
          : undefined,
    });
}

export type owl_Ontology = {
  readonly $identifier: () => owl_Ontology.Identifier;

  readonly comment: readonly Literal[];

  readonly label: readonly Literal[];
};

export namespace owl_Ontology {
  export const _toRdfResource: $_ToRdfResourceFunction<
    owl_Ontology.Identifier,
    owl_Ontology
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        owl_Ontology.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      shaclmate_Service.schema.properties.comment.path,
      parameters.object.comment.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      shaclmate_Service.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<Omit<owl_Ontology, "comment">> = (
    _owlOntology,
  ) =>
    `owl_Ontology(${JSON.stringify(owl_Ontology.toStringRecord(_owlOntology))})`;

  export const create: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: owl_Ontology.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, owl_Ontology.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(parameters.$identifier, {
        defaultNamespace: parameters.$defaultNamespace,
      }),
      termType: Right("owl_Ontology" as const),
      comment: $convertToScalarSet($convertToLiteral)(parameters.comment, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.comment.type,
          value,
        ),
      ),
      label: $convertToScalarSet($convertToLiteral)(parameters.label, {
        defaultNamespace: parameters.$defaultNamespace,
      }).chain((value) =>
        $Array.validate($identityValidationFunction)(
          shaclmate_Service.schema.properties.label.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: owl_Ontology.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => owl_Ontology.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly comment?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
    readonly label?:
      | bigint
      | boolean
      | number
      | string
      | Date
      | Literal
      | readonly (bigint | boolean | number | string | Date | Literal)[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends NamespaceBuilder = NamespaceBuilder,
  >(
    parameters: owl_Ontology.CreateParameters<$DefaultNamespaceT>,
  ) => owl_Ontology.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = owl_Ontology & {
    readonly termType: "owl_Ontology";
  };

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isowl_Ontology: $ObjectTypeGuardFunction<
    owl_Ontology.Discriminated
  > = (object): object is owl_Ontology.Discriminated =>
    object.termType === "owl_Ontology";

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      $rdfType: {
        fromRdfType: dataFactory.namedNode(
          "http://www.w3.org/2002/07/owl#Ontology",
        ),
        kind: "RdfType",
        toRdfTypes: [
          dataFactory.namedNode("http://www.w3.org/2002/07/owl#Ontology"),
        ],
      } as const,
      comment: {
        kind: "Shacl",
        path: $rdfs_comment,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: { itemType: { kind: "Literal" } as const, kind: "Set" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    owl_Ontology.Identifier,
    owl_Ontology
  > = $wrap_ToRdfResourceFunction<owl_Ontology.Identifier, owl_Ontology>(
    owl_Ontology._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    owl_Ontology,
    NamedNode
  > = (value, options) => [
    owl_Ontology.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Omit<owl_Ontology, "comment">
  > = (_owlOntology) =>
    $compactRecord({
      $identifier: _owlOntology.$identifier().toString(),
      label:
        _owlOntology.label.length > 0
          ? `[${_owlOntology.label.map((item) => item.toString())}]`
          : undefined,
    });
}

export type HttpSuccessStatusCode = HttpSuccessStatusCode.Schema["in"][number];

export namespace HttpSuccessStatusCode {
  export const schema = {
    datatype: $xsd_int,
    in: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226] as const,
    kind: "Int",
  } as const;

  export type Schema = typeof schema;
}

export type HttpMethod = HttpMethod.Schema["in"][number];

export namespace HttpMethod {
  export const schema = {
    datatype: $xsd_string,
    in: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"] as const,
    kind: "String",
  } as const;

  export type Schema = typeof schema;
}

export type HttpErrorStatusCode = HttpErrorStatusCode.Schema["in"][number];

export namespace HttpErrorStatusCode {
  export const schema = {
    datatype: $xsd_int,
    in: [
      400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
      415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500,
      501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
    ] as const,
    kind: "Int",
  } as const;

  export type Schema = typeof schema;
}

export type $Object =
  | owl_Ontology.Discriminated
  | rdf_Property.Discriminated
  | rdf_Statement.Discriminated
  | rdfs_Class.Discriminated
  | sh_BaseShape.Discriminated
  | sh_NodeShapeSpecificProperties.Discriminated
  | sh_PropertyGroup.Discriminated
  | sh_PropertyShapeSpecificProperties.Discriminated
  | shaclmate_Operation.Discriminated
  | shaclmate_OperationErrorHttpBinding.Discriminated
  | shaclmate_OperationHttpBinding.Discriminated
  | shaclmate_OperationInputHttpBinding.Discriminated
  | shaclmate_OperationOutputHttpBinding.Discriminated
  | shaclmate_Service.Discriminated
  | ShaclmateOperationErrorSpecificProperties.Discriminated
  | ShaclmateOperationInputSpecificProperties.Discriminated
  | ShaclmateOperationOutputSpecificProperties.Discriminated
  | skos_Concept.Discriminated
  | skos_ConceptScheme.Discriminated
  | sh_NodeShape.Discriminated
  | sh_PropertyShape.Discriminated
  | shaclmate_OperationError.Discriminated
  | shaclmate_OperationInput.Discriminated
  | shaclmate_OperationOutput.Discriminated;

export namespace $Object {
  export const toRdfResource: $ToRdfResourceFunction<
    Resource.Identifier,
    $Object
  > = (object, options) => {
    switch (object.termType) {
      case "owl_Ontology":
        return owl_Ontology.toRdfResource(object, options);
      case "rdf_Property":
        return rdf_Property.toRdfResource(object, options);
      case "rdf_Statement":
        return rdf_Statement.toRdfResource(object, options);
      case "rdfs_Class":
        return rdfs_Class.toRdfResource(object, options);
      case "sh_BaseShape":
        return sh_BaseShape.toRdfResource(object, options);
      case "sh_NodeShapeSpecificProperties":
        return sh_NodeShapeSpecificProperties.toRdfResource(object, options);
      case "sh_PropertyGroup":
        return sh_PropertyGroup.toRdfResource(object, options);
      case "sh_PropertyShapeSpecificProperties":
        return sh_PropertyShapeSpecificProperties.toRdfResource(
          object,
          options,
        );
      case "shaclmate_Operation":
        return shaclmate_Operation.toRdfResource(object, options);
      case "shaclmate_OperationErrorHttpBinding":
        return shaclmate_OperationErrorHttpBinding.toRdfResource(
          object,
          options,
        );
      case "shaclmate_OperationHttpBinding":
        return shaclmate_OperationHttpBinding.toRdfResource(object, options);
      case "shaclmate_OperationInputHttpBinding":
        return shaclmate_OperationInputHttpBinding.toRdfResource(
          object,
          options,
        );
      case "shaclmate_OperationOutputHttpBinding":
        return shaclmate_OperationOutputHttpBinding.toRdfResource(
          object,
          options,
        );
      case "shaclmate_Service":
        return shaclmate_Service.toRdfResource(object, options);
      case "ShaclmateOperationErrorSpecificProperties":
        return ShaclmateOperationErrorSpecificProperties.toRdfResource(
          object,
          options,
        );
      case "ShaclmateOperationInputSpecificProperties":
        return ShaclmateOperationInputSpecificProperties.toRdfResource(
          object,
          options,
        );
      case "ShaclmateOperationOutputSpecificProperties":
        return ShaclmateOperationOutputSpecificProperties.toRdfResource(
          object,
          options,
        );
      case "skos_Concept":
        return skos_Concept.toRdfResource(object, options);
      case "skos_ConceptScheme":
        return skos_ConceptScheme.toRdfResource(object, options);
      case "sh_NodeShape":
        return sh_NodeShape.toRdfResource(object, options);
      case "sh_PropertyShape":
        return sh_PropertyShape.toRdfResource(object, options);
      case "shaclmate_OperationError":
        return shaclmate_OperationError.toRdfResource(object, options);
      case "shaclmate_OperationInput":
        return shaclmate_OperationInput.toRdfResource(object, options);
      case "shaclmate_OperationOutput":
        return shaclmate_OperationOutput.toRdfResource(object, options);
      default:
        object satisfies never;
        throw new Error("should never reach this point");
    }
  };

  export function $toString(object: $Object) {
    switch (object.termType) {
      case "owl_Ontology":
        return owl_Ontology.$toString(object);
      case "rdf_Property":
        return rdf_Property.$toString(object);
      case "rdf_Statement":
        return rdf_Statement.$toString(object);
      case "rdfs_Class":
        return rdfs_Class.$toString(object);
      case "sh_BaseShape":
        return sh_BaseShape.$toString(object);
      case "sh_NodeShapeSpecificProperties":
        return sh_NodeShapeSpecificProperties.$toString(object);
      case "sh_PropertyGroup":
        return sh_PropertyGroup.$toString(object);
      case "sh_PropertyShapeSpecificProperties":
        return sh_PropertyShapeSpecificProperties.$toString(object);
      case "shaclmate_Operation":
        return shaclmate_Operation.$toString(object);
      case "shaclmate_OperationErrorHttpBinding":
        return shaclmate_OperationErrorHttpBinding.$toString(object);
      case "shaclmate_OperationHttpBinding":
        return shaclmate_OperationHttpBinding.$toString(object);
      case "shaclmate_OperationInputHttpBinding":
        return shaclmate_OperationInputHttpBinding.$toString(object);
      case "shaclmate_OperationOutputHttpBinding":
        return shaclmate_OperationOutputHttpBinding.$toString(object);
      case "shaclmate_Service":
        return shaclmate_Service.$toString(object);
      case "ShaclmateOperationErrorSpecificProperties":
        return ShaclmateOperationErrorSpecificProperties.$toString(object);
      case "ShaclmateOperationInputSpecificProperties":
        return ShaclmateOperationInputSpecificProperties.$toString(object);
      case "ShaclmateOperationOutputSpecificProperties":
        return ShaclmateOperationOutputSpecificProperties.$toString(object);
      case "skos_Concept":
        return skos_Concept.$toString(object);
      case "skos_ConceptScheme":
        return skos_ConceptScheme.$toString(object);
      case "sh_NodeShape":
        return sh_NodeShape.$toString(object);
      case "sh_PropertyShape":
        return sh_PropertyShape.$toString(object);
      case "shaclmate_OperationError":
        return shaclmate_OperationError.$toString(object);
      case "shaclmate_OperationInput":
        return shaclmate_OperationInput.$toString(object);
      case "shaclmate_OperationOutput":
        return shaclmate_OperationOutput.$toString(object);
      default:
        object satisfies never;
        throw new Error("should never reach this point");
    }
  }
}
