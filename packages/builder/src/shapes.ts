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
import { Either, Left, Maybe, Right } from "purify-ts";

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

type $ConversionFunction<SourceT, TargetT> = (
  source: SourceT,
) => Either<Error, TargetT>;

function $convertToIdentifier(
  value: BlankNode | NamedNode | string | undefined,
): Either<Error, BlankNode | NamedNode> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return Either.of(dataFactory.namedNode(value));
    case "undefined":
      return Either.of(dataFactory.blankNode());
  }
}

function $convertToIdentifierProperty(
  identifier:
    | (() => BlankNode | NamedNode)
    | BlankNode
    | NamedNode
    | string
    | undefined,
): Either<Error, () => BlankNode | NamedNode> {
  switch (typeof identifier) {
    case "function":
      return Either.of(identifier);
    case "object": {
      const captureIdentifier = identifier;
      return Either.of(() => captureIdentifier);
    }
    case "string": {
      const captureIdentifier = dataFactory.namedNode(identifier);
      return Either.of(() => captureIdentifier);
    }
    case "undefined": {
      const captureIdentifier = dataFactory.blankNode();
      return Either.of(() => captureIdentifier);
    }
  }
}

function $convertToIri<IriT extends string>(
  value: IriT | NamedNode<IriT>,
): Either<Error, NamedNode<IriT>> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return Either.of(dataFactory.namedNode<IriT>(value));
  }
}

function $convertToList<ItemSourceT, ItemTargetT, Readonly extends boolean>(
  convertToItem: $ConversionFunction<ItemSourceT, ItemTargetT>,
  _readonly: Readonly,
) {
  type ItemTargetArrayT = Readonly extends true
    ? ReadonlyArray<ItemTargetT>
    : Array<ItemTargetT>;
  return (value: readonly ItemSourceT[]): Either<Error, ItemTargetArrayT> =>
    Either.sequence(value.map(convertToItem)) as Either<
      Error,
      ItemTargetArrayT
    >;
}

function $convertToLiteral(
  value: bigint | boolean | Date | number | string | Literal,
): Either<Error, Literal> {
  if (typeof value === "object") {
    if (value instanceof Date) {
      return Either.of($literalFactory.date(value));
    }
    return Either.of(value);
  }

  return Either.of($literalFactory.primitive(value));
}

function $convertToMaybe<ItemSourceT, ItemTargetT>(
  convertToItem: $ConversionFunction<ItemSourceT, ItemTargetT>,
) {
  return (
    value: ItemSourceT | Maybe<ItemTargetT> | undefined,
  ): Either<Error, Maybe<ItemTargetT>> => {
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

    return convertToItem(value).map(Maybe.of);
  };
}

function $convertToScalarSet<
  ItemSourceT,
  ItemTargetT,
  Readonly extends boolean,
>(
  convertToItem: $ConversionFunction<ItemSourceT, ItemTargetT>,
  _readonly: Readonly,
) {
  type ItemTargetArrayT = Readonly extends true
    ? ReadonlyArray<ItemTargetT>
    : Array<ItemTargetT>;
  return (
    value: ItemSourceT | readonly ItemSourceT[] | undefined,
  ): Either<Error, ItemTargetArrayT> => {
    if (typeof value === "undefined") {
      return Either.of<Error, ItemTargetArrayT>(
        [] as unknown as ItemTargetArrayT,
      );
    }
    if (Array.isArray(value)) {
      return Either.sequence(value.map(convertToItem)) as Either<
        Error,
        ItemTargetArrayT
      >;
    }
    return convertToItem(value as ItemSourceT).map((value) => [
      value,
    ]) as Either<Error, ItemTargetArrayT>;
  };
}

function $convertWithDefaultValue<ItemSourceT, ItemTargetT>(
  convertToItem: $ConversionFunction<ItemSourceT, ItemTargetT>,
  defaultValue: ItemSourceT,
) {
  return (value: ItemSourceT | undefined): Either<Error, ItemTargetT> => {
    if (typeof value === "undefined") {
      return convertToItem(defaultValue);
    }
    return convertToItem(value);
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

function $identityConversionFunction<T>(value: T): Either<Error, T> {
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

const $parseIdentifier = NTriplesIdentifier.parser(dataFactory);

export type $PropertyPath = RdfxResourcePropertyPath;

export namespace $PropertyPath {
  export const schema: Readonly<object> = {};

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<$PropertyPath> =
    RdfxResourcePropertyPath.toResource;

  export const $toString = RdfxResourcePropertyPath.toString;
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

function $validateArray<ItemSchemaT, ItemValueT, Readonly extends boolean>(
  validateItem: $ValidationFunction<ItemSchemaT, ItemValueT>,
  _readonly: Readonly,
) {
  type EitherR = Readonly extends true
    ? ReadonlyArray<ItemValueT>
    : Array<ItemValueT>;
  return (
    schema: $CollectionSchema<ItemSchemaT>,
    valueArray: readonly ItemValueT[],
  ): Either<Error, EitherR> => {
    if (schema.minCount !== undefined && valueArray.length < schema.minCount) {
      return Left(
        new Error(
          `value array has length (${valueArray.length}) less than minCount (${schema.minCount})`,
        ),
      ) as Either<Error, EitherR>;
    }

    return Either.sequence(
      valueArray.map((value) => validateItem(schema.itemType, value)),
    ) as Either<Error, EitherR>;
  };
}

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

  readonly severity: Maybe<sh_Severity>;

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
  export const create: (parameters?: {
    readonly $identifier?:
      | (() => sh_NodeShape.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly and?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly classes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly closed?: boolean | Maybe<boolean>;
    readonly comment?: string | Maybe<string>;
    readonly datatype?: string | NamedNode | Maybe<NamedNode>;
    readonly deactivated?: boolean | Maybe<boolean>;
    readonly discriminantValue?: string | Maybe<string>;
    readonly extern?: boolean | Maybe<boolean>;
    readonly flags?: string | Maybe<string>;
    readonly fromRdfType?: string | NamedNode | Maybe<NamedNode>;
    readonly hasValues?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly ignore?: boolean;
    readonly ignoredProperties?:
      | readonly (string | NamedNode)[]
      | Maybe<readonly NamedNode[]>;
    readonly in_?:
      | readonly (NamedNode | Literal)[]
      | Maybe<readonly (NamedNode | Literal)[]>;
    readonly isDefinedBy?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly label?: string | Maybe<string>;
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
    readonly maxLength?: bigint | Maybe<bigint>;
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
    readonly minLength?: bigint | Maybe<bigint>;
    readonly mutable?: boolean | Maybe<boolean>;
    readonly node?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
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
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly or?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly pattern?: string | Maybe<string>;
    readonly properties?:
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly rdfType?: string | NamedNode | Maybe<NamedNode>;
    readonly severity?:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity
      | Maybe<sh_Severity>;
    readonly shaclmateName?: string | Maybe<string>;
    readonly subClassOf?: string | NamedNode | readonly (string | NamedNode)[];
    readonly targetClasses?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetNodes?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly targetObjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetSubjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly toRdfTypes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly tsImports?: string | readonly string[];
    readonly types?: string | NamedNode | readonly (string | NamedNode)[];
    readonly xone?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
  }) => Either<Error, sh_NodeShape> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters?.$identifier),
      and: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters?.and,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.and.type,
          value,
        ),
      ),
      classes: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.classes).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.classes.type,
          value,
        ),
      ),
      closed: $convertToMaybe($identityConversionFunction)(
        parameters?.closed,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.closed.type,
          value,
        ),
      ),
      comment: $convertToMaybe($identityConversionFunction)(
        parameters?.comment,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.comment.type,
          value,
        ),
      ),
      datatype: $convertToMaybe($convertToIri<string>)(
        parameters?.datatype,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.datatype.type,
          value,
        ),
      ),
      deactivated: $convertToMaybe($identityConversionFunction)(
        parameters?.deactivated,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.deactivated.type,
          value,
        ),
      ),
      discriminantValue: $convertToMaybe($identityConversionFunction)(
        parameters?.discriminantValue,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.discriminantValue.type,
          value,
        ),
      ),
      extern: $convertToMaybe($identityConversionFunction)(
        parameters?.extern,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.extern.type,
          value,
        ),
      ),
      flags: $convertToMaybe($identityConversionFunction)(
        parameters?.flags,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.flags.type,
          value,
        ),
      ),
      fromRdfType: $convertToMaybe($convertToIri<string>)(
        parameters?.fromRdfType,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.fromRdfType.type,
          value,
        ),
      ),
      hasValues: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters?.hasValues).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.hasValues.type,
          value,
        ),
      ),
      ignore: $convertWithDefaultValue(
        $identityConversionFunction,
        false,
      )(parameters?.ignore),
      ignoredProperties: $convertToMaybe(
        $convertToList($convertToIri<string>, true),
      )(parameters?.ignoredProperties).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.ignoredProperties.type,
          value,
        ),
      ),
      in_: $convertToMaybe($convertToList($identityConversionFunction, true))(
        parameters?.in_,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.in_.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIdentifier)(
        parameters?.isDefinedBy,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToMaybe($identityConversionFunction)(
        parameters?.label,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.label.type,
          value,
        ),
      ),
      languageIn: $convertToMaybe(
        $convertToList($identityConversionFunction, true),
      )(parameters?.languageIn).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.languageIn.type,
          value,
        ),
      ),
      maxExclusive: $convertToMaybe($convertToLiteral)(
        parameters?.maxExclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxExclusive.type,
          value,
        ),
      ),
      maxInclusive: $convertToMaybe($convertToLiteral)(
        parameters?.maxInclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxInclusive.type,
          value,
        ),
      ),
      maxLength: $convertToMaybe($identityConversionFunction)(
        parameters?.maxLength,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxLength.type,
          value,
        ),
      ),
      message: $convertToMaybe($identityConversionFunction)(
        parameters?.message,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.message.type,
          value,
        ),
      ),
      minExclusive: $convertToMaybe($convertToLiteral)(
        parameters?.minExclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minExclusive.type,
          value,
        ),
      ),
      minInclusive: $convertToMaybe($convertToLiteral)(
        parameters?.minInclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minInclusive.type,
          value,
        ),
      ),
      minLength: $convertToMaybe($identityConversionFunction)(
        parameters?.minLength,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minLength.type,
          value,
        ),
      ),
      mutable: $convertToMaybe($identityConversionFunction)(
        parameters?.mutable,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.mutable.type,
          value,
        ),
      ),
      node: $convertToMaybe($convertToIdentifier)(parameters?.node).chain(
        (value) =>
          $validateMaybe($identityValidationFunction)(
            sh_NodeShape.schema.properties.node.type,
            value,
          ),
      ),
      nodeKind: $convertToMaybe(
        $convertToIri<
          | "http://www.w3.org/ns/shacl#BlankNode"
          | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
          | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
          | "http://www.w3.org/ns/shacl#IRI"
          | "http://www.w3.org/ns/shacl#IRIOrLiteral"
          | "http://www.w3.org/ns/shacl#Literal"
        >,
      )(parameters?.nodeKind).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.nodeKind.type,
          value,
        ),
      ),
      not: $convertToScalarSet(
        $convertToIdentifier,
        true,
      )(parameters?.not).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.not.type,
          value,
        ),
      ),
      or: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters?.or,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.or.type,
          value,
        ),
      ),
      pattern: $convertToMaybe($identityConversionFunction)(
        parameters?.pattern,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.pattern.type,
          value,
        ),
      ),
      properties: $convertToScalarSet(
        $convertToIdentifier,
        true,
      )(parameters?.properties).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.properties.type,
          value,
        ),
      ),
      rdfType: $convertToMaybe($convertToIri<string>)(
        parameters?.rdfType,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.rdfType.type,
          value,
        ),
      ),
      severity: $convertToMaybe(
        $convertToIri<
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        >,
      )(parameters?.severity).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.severity.type,
          value,
        ),
      ),
      shaclmateName: $convertToMaybe($identityConversionFunction)(
        parameters?.shaclmateName,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.shaclmateName.type,
          value,
        ),
      ),
      subClassOf: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.subClassOf).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.subClassOf.type,
          value,
        ),
      ),
      targetClasses: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.targetClasses).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetClasses.type,
          value,
        ),
      ),
      targetNodes: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters?.targetNodes).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetNodes.type,
          value,
        ),
      ),
      targetObjectsOf: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.targetObjectsOf).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetObjectsOf.type,
          value,
        ),
      ),
      targetSubjectsOf: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.targetSubjectsOf).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetSubjectsOf.type,
          value,
        ),
      ),
      toRdfTypes: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.toRdfTypes).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.toRdfTypes.type,
          value,
        ),
      ),
      tsImports: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters?.tsImports).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.tsImports.type,
          value,
        ),
      ),
      types: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters?.types).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.types.type,
          value,
        ),
      ),
      xone: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters?.xone,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.xone.type,
          value,
        ),
      ),
    })
      .map((properties) => ({ ...properties, $type: "sh_NodeShape" as const }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_NodeShape.$toString }),
      );

  export function createUnsafe(parameters?: {
    readonly $identifier?:
      | (() => sh_NodeShape.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly and?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly classes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly closed?: boolean | Maybe<boolean>;
    readonly comment?: string | Maybe<string>;
    readonly datatype?: string | NamedNode | Maybe<NamedNode>;
    readonly deactivated?: boolean | Maybe<boolean>;
    readonly discriminantValue?: string | Maybe<string>;
    readonly extern?: boolean | Maybe<boolean>;
    readonly flags?: string | Maybe<string>;
    readonly fromRdfType?: string | NamedNode | Maybe<NamedNode>;
    readonly hasValues?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly ignore?: boolean;
    readonly ignoredProperties?:
      | readonly (string | NamedNode)[]
      | Maybe<readonly NamedNode[]>;
    readonly in_?:
      | readonly (NamedNode | Literal)[]
      | Maybe<readonly (NamedNode | Literal)[]>;
    readonly isDefinedBy?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly label?: string | Maybe<string>;
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
    readonly maxLength?: bigint | Maybe<bigint>;
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
    readonly minLength?: bigint | Maybe<bigint>;
    readonly mutable?: boolean | Maybe<boolean>;
    readonly node?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
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
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly or?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly pattern?: string | Maybe<string>;
    readonly properties?:
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly rdfType?: string | NamedNode | Maybe<NamedNode>;
    readonly severity?:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity
      | Maybe<sh_Severity>;
    readonly shaclmateName?: string | Maybe<string>;
    readonly subClassOf?: string | NamedNode | readonly (string | NamedNode)[];
    readonly targetClasses?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetNodes?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly targetObjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetSubjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly toRdfTypes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly tsImports?: string | readonly string[];
    readonly types?: string | NamedNode | readonly (string | NamedNode)[];
    readonly xone?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
  }): sh_NodeShape {
    return create(parameters).unsafeCoerce();
  }

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

  export const $toString: (_shNodeShape: sh_NodeShape) => string = (
    _shNodeShape,
  ) => `sh_NodeShape(${JSON.stringify(toStringRecord(_shNodeShape))})`;

  export const toStringRecord: (
    _shNodeShape: sh_NodeShape,
  ) => Record<string, string> = (_shNodeShape) =>
    $compactRecord({
      $identifier: _shNodeShape.$identifier().toString(),
      label: _shNodeShape.label.map((item) => item.toString()).extract(),
      shaclmateName: _shNodeShape.shaclmateName
        .map((item) => item.toString())
        .extract(),
    });
}
export type sh_Ontology = {
  readonly $identifier: () => sh_Ontology.Identifier;

  readonly $type: "sh_Ontology";

  readonly comment: Maybe<string>;

  readonly label: Maybe<string>;
};

export namespace sh_Ontology {
  export const create: (parameters?: {
    readonly $identifier?:
      | (() => sh_Ontology.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly comment?: string | Maybe<string>;
    readonly label?: string | Maybe<string>;
  }) => Either<Error, sh_Ontology> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters?.$identifier),
      comment: $convertToMaybe($identityConversionFunction)(
        parameters?.comment,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.comment.type,
          value,
        ),
      ),
      label: $convertToMaybe($identityConversionFunction)(
        parameters?.label,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.label.type,
          value,
        ),
      ),
    })
      .map((properties) => ({ ...properties, $type: "sh_Ontology" as const }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_Ontology.$toString }),
      );

  export function createUnsafe(parameters?: {
    readonly $identifier?:
      | (() => sh_Ontology.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly comment?: string | Maybe<string>;
    readonly label?: string | Maybe<string>;
  }): sh_Ontology {
    return create(parameters).unsafeCoerce();
  }

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

  export const $toString: (_shOntology: sh_Ontology) => string = (
    _shOntology,
  ) => `sh_Ontology(${JSON.stringify(toStringRecord(_shOntology))})`;

  export const toStringRecord: (
    _shOntology: sh_Ontology,
  ) => Record<string, string> = (_shOntology) =>
    $compactRecord({
      $identifier: _shOntology.$identifier().toString(),
      label: _shOntology.label.map((item) => item.toString()).extract(),
    });
}
export type sh_PropertyGroup = {
  readonly $identifier: () => sh_PropertyGroup.Identifier;

  readonly $type: "sh_PropertyGroup";

  readonly comment: Maybe<string>;

  readonly label: Maybe<string>;
};

export namespace sh_PropertyGroup {
  export const create: (parameters?: {
    readonly $identifier?:
      | (() => sh_PropertyGroup.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly comment?: string | Maybe<string>;
    readonly label?: string | Maybe<string>;
  }) => Either<Error, sh_PropertyGroup> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters?.$identifier),
      comment: $convertToMaybe($identityConversionFunction)(
        parameters?.comment,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.comment.type,
          value,
        ),
      ),
      label: $convertToMaybe($identityConversionFunction)(
        parameters?.label,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.label.type,
          value,
        ),
      ),
    })
      .map((properties) => ({
        ...properties,
        $type: "sh_PropertyGroup" as const,
      }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_PropertyGroup.$toString }),
      );

  export function createUnsafe(parameters?: {
    readonly $identifier?:
      | (() => sh_PropertyGroup.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly comment?: string | Maybe<string>;
    readonly label?: string | Maybe<string>;
  }): sh_PropertyGroup {
    return create(parameters).unsafeCoerce();
  }

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

  export const $toString: (_shPropertyGroup: sh_PropertyGroup) => string = (
    _shPropertyGroup,
  ) => `sh_PropertyGroup(${JSON.stringify(toStringRecord(_shPropertyGroup))})`;

  export const toStringRecord: (
    _shPropertyGroup: sh_PropertyGroup,
  ) => Record<string, string> = (_shPropertyGroup) =>
    $compactRecord({
      $identifier: _shPropertyGroup.$identifier().toString(),
      label: _shPropertyGroup.label.map((item) => item.toString()).extract(),
    });
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

  readonly path: $PropertyPath;

  readonly pattern: Maybe<string>;

  readonly qualifiedMaxCount: Maybe<bigint>;

  readonly qualifiedMinCount: Maybe<bigint>;

  readonly qualifiedValueShape: Maybe<BlankNode | NamedNode>;

  readonly qualifiedValueShapesDisjoint: Maybe<boolean>;

  readonly resolve: Maybe<BlankNode | NamedNode>;

  readonly severity: Maybe<sh_Severity>;

  readonly shaclmateName: Maybe<string>;

  readonly targetClasses: readonly NamedNode[];

  readonly targetNodes: readonly (NamedNode | Literal)[];

  readonly targetObjectsOf: readonly NamedNode[];

  readonly targetSubjectsOf: readonly NamedNode[];

  readonly uniqueLang: Maybe<boolean>;

  readonly xone: Maybe<readonly (BlankNode | NamedNode)[]>;
};

export namespace sh_PropertyShape {
  export const create: (parameters: {
    readonly $identifier?:
      | (() => sh_PropertyShape.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly and?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly classes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly comment?: string | Maybe<string>;
    readonly datatype?: string | NamedNode | Maybe<NamedNode>;
    readonly deactivated?: boolean | Maybe<boolean>;
    readonly defaultValue?: (NamedNode | Literal) | Maybe<NamedNode | Literal>;
    readonly description?: string | Maybe<string>;
    readonly disjoint?: string | NamedNode | readonly (string | NamedNode)[];
    readonly display?: boolean;
    readonly equals?: string | NamedNode | readonly (string | NamedNode)[];
    readonly flags?: string | Maybe<string>;
    readonly groups?:
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly hasValues?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly ignore?: boolean;
    readonly in_?:
      | readonly (NamedNode | Literal)[]
      | Maybe<readonly (NamedNode | Literal)[]>;
    readonly isDefinedBy?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly label?: string | Maybe<string>;
    readonly languageIn?: readonly string[] | Maybe<readonly string[]>;
    readonly lessThan?: string | NamedNode | readonly (string | NamedNode)[];
    readonly lessThanOrEquals?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly maxCount?: bigint | Maybe<bigint>;
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
    readonly maxLength?: bigint | Maybe<bigint>;
    readonly message?: string | Maybe<string>;
    readonly minCount?: bigint | Maybe<bigint>;
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
    readonly minLength?: bigint | Maybe<bigint>;
    readonly mutable?: boolean | Maybe<boolean>;
    readonly name?: string | Maybe<string>;
    readonly node?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
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
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly or?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly order?: number | Maybe<number>;
    readonly path: $PropertyPath;
    readonly pattern?: string | Maybe<string>;
    readonly qualifiedMaxCount?: bigint | Maybe<bigint>;
    readonly qualifiedMinCount?: bigint | Maybe<bigint>;
    readonly qualifiedValueShape?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly qualifiedValueShapesDisjoint?: boolean | Maybe<boolean>;
    readonly resolve?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly severity?:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity
      | Maybe<sh_Severity>;
    readonly shaclmateName?: string | Maybe<string>;
    readonly targetClasses?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetNodes?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly targetObjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetSubjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly uniqueLang?: boolean | Maybe<boolean>;
    readonly xone?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
  }) => Either<Error, sh_PropertyShape> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier),
      and: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters.and,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.and.type,
          value,
        ),
      ),
      classes: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.classes).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.classes.type,
          value,
        ),
      ),
      comment: $convertToMaybe($identityConversionFunction)(
        parameters.comment,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.comment.type,
          value,
        ),
      ),
      datatype: $convertToMaybe($convertToIri<string>)(
        parameters.datatype,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.datatype.type,
          value,
        ),
      ),
      deactivated: $convertToMaybe($identityConversionFunction)(
        parameters.deactivated,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.deactivated.type,
          value,
        ),
      ),
      defaultValue: $convertToMaybe($identityConversionFunction)(
        parameters.defaultValue,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.defaultValue.type,
          value,
        ),
      ),
      description: $convertToMaybe($identityConversionFunction)(
        parameters.description,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.description.type,
          value,
        ),
      ),
      disjoint: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.disjoint).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_PropertyShape.schema.properties.disjoint.type,
          value,
        ),
      ),
      display: $convertWithDefaultValue(
        $identityConversionFunction,
        false,
      )(parameters.display),
      equals: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.equals).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_PropertyShape.schema.properties.equals.type,
          value,
        ),
      ),
      flags: $convertToMaybe($identityConversionFunction)(
        parameters.flags,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.flags.type,
          value,
        ),
      ),
      groups: $convertToScalarSet(
        $convertToIdentifier,
        true,
      )(parameters.groups).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_PropertyShape.schema.properties.groups.type,
          value,
        ),
      ),
      hasValues: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters.hasValues).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.hasValues.type,
          value,
        ),
      ),
      ignore: $convertWithDefaultValue(
        $identityConversionFunction,
        false,
      )(parameters.ignore),
      in_: $convertToMaybe($convertToList($identityConversionFunction, true))(
        parameters.in_,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.in_.type,
          value,
        ),
      ),
      isDefinedBy: $convertToMaybe($convertToIdentifier)(
        parameters.isDefinedBy,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.isDefinedBy.type,
          value,
        ),
      ),
      label: $convertToMaybe($identityConversionFunction)(
        parameters.label,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.label.type,
          value,
        ),
      ),
      languageIn: $convertToMaybe(
        $convertToList($identityConversionFunction, true),
      )(parameters.languageIn).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.languageIn.type,
          value,
        ),
      ),
      lessThan: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.lessThan).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_PropertyShape.schema.properties.lessThan.type,
          value,
        ),
      ),
      lessThanOrEquals: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.lessThanOrEquals).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_PropertyShape.schema.properties.lessThanOrEquals.type,
          value,
        ),
      ),
      maxCount: $convertToMaybe($identityConversionFunction)(
        parameters.maxCount,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.maxCount.type,
          value,
        ),
      ),
      maxExclusive: $convertToMaybe($convertToLiteral)(
        parameters.maxExclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxExclusive.type,
          value,
        ),
      ),
      maxInclusive: $convertToMaybe($convertToLiteral)(
        parameters.maxInclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxInclusive.type,
          value,
        ),
      ),
      maxLength: $convertToMaybe($identityConversionFunction)(
        parameters.maxLength,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.maxLength.type,
          value,
        ),
      ),
      message: $convertToMaybe($identityConversionFunction)(
        parameters.message,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.message.type,
          value,
        ),
      ),
      minCount: $convertToMaybe($identityConversionFunction)(
        parameters.minCount,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.minCount.type,
          value,
        ),
      ),
      minExclusive: $convertToMaybe($convertToLiteral)(
        parameters.minExclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minExclusive.type,
          value,
        ),
      ),
      minInclusive: $convertToMaybe($convertToLiteral)(
        parameters.minInclusive,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minInclusive.type,
          value,
        ),
      ),
      minLength: $convertToMaybe($identityConversionFunction)(
        parameters.minLength,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.minLength.type,
          value,
        ),
      ),
      mutable: $convertToMaybe($identityConversionFunction)(
        parameters.mutable,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.mutable.type,
          value,
        ),
      ),
      name: $convertToMaybe($identityConversionFunction)(parameters.name).chain(
        (value) =>
          $validateMaybe($identityValidationFunction)(
            sh_PropertyShape.schema.properties.name.type,
            value,
          ),
      ),
      node: $convertToMaybe($convertToIdentifier)(parameters.node).chain(
        (value) =>
          $validateMaybe($identityValidationFunction)(
            sh_NodeShape.schema.properties.node.type,
            value,
          ),
      ),
      nodeKind: $convertToMaybe(
        $convertToIri<
          | "http://www.w3.org/ns/shacl#BlankNode"
          | "http://www.w3.org/ns/shacl#BlankNodeOrIRI"
          | "http://www.w3.org/ns/shacl#BlankNodeOrLiteral"
          | "http://www.w3.org/ns/shacl#IRI"
          | "http://www.w3.org/ns/shacl#IRIOrLiteral"
          | "http://www.w3.org/ns/shacl#Literal"
        >,
      )(parameters.nodeKind).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.nodeKind.type,
          value,
        ),
      ),
      not: $convertToScalarSet(
        $convertToIdentifier,
        true,
      )(parameters.not).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.not.type,
          value,
        ),
      ),
      or: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters.or,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.or.type,
          value,
        ),
      ),
      order: $convertToMaybe($identityConversionFunction)(
        parameters.order,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.order.type,
          value,
        ),
      ),
      path: Either.of(parameters.path),
      pattern: $convertToMaybe($identityConversionFunction)(
        parameters.pattern,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.pattern.type,
          value,
        ),
      ),
      qualifiedMaxCount: $convertToMaybe($identityConversionFunction)(
        parameters.qualifiedMaxCount,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.qualifiedMaxCount.type,
          value,
        ),
      ),
      qualifiedMinCount: $convertToMaybe($identityConversionFunction)(
        parameters.qualifiedMinCount,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.qualifiedMinCount.type,
          value,
        ),
      ),
      qualifiedValueShape: $convertToMaybe($convertToIdentifier)(
        parameters.qualifiedValueShape,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.qualifiedValueShape.type,
          value,
        ),
      ),
      qualifiedValueShapesDisjoint: $convertToMaybe(
        $identityConversionFunction,
      )(parameters.qualifiedValueShapesDisjoint).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.qualifiedValueShapesDisjoint.type,
          value,
        ),
      ),
      resolve: $convertToMaybe($convertToIdentifier)(parameters.resolve).chain(
        (value) =>
          $validateMaybe($identityValidationFunction)(
            sh_PropertyShape.schema.properties.resolve.type,
            value,
          ),
      ),
      severity: $convertToMaybe(
        $convertToIri<
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        >,
      )(parameters.severity).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.severity.type,
          value,
        ),
      ),
      shaclmateName: $convertToMaybe($identityConversionFunction)(
        parameters.shaclmateName,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_NodeShape.schema.properties.shaclmateName.type,
          value,
        ),
      ),
      targetClasses: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.targetClasses).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetClasses.type,
          value,
        ),
      ),
      targetNodes: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters.targetNodes).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetNodes.type,
          value,
        ),
      ),
      targetObjectsOf: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.targetObjectsOf).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetObjectsOf.type,
          value,
        ),
      ),
      targetSubjectsOf: $convertToScalarSet(
        $convertToIri<string>,
        true,
      )(parameters.targetSubjectsOf).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_NodeShape.schema.properties.targetSubjectsOf.type,
          value,
        ),
      ),
      uniqueLang: $convertToMaybe($identityConversionFunction)(
        parameters.uniqueLang,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_PropertyShape.schema.properties.uniqueLang.type,
          value,
        ),
      ),
      xone: $convertToMaybe($convertToList($convertToIdentifier, true))(
        parameters.xone,
      ).chain((value) =>
        $validateMaybe($validateArray($identityValidationFunction, true))(
          sh_NodeShape.schema.properties.xone.type,
          value,
        ),
      ),
    })
      .map((properties) => ({
        ...properties,
        $type: "sh_PropertyShape" as const,
      }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: sh_PropertyShape.$toString }),
      );

  export function createUnsafe(parameters: {
    readonly $identifier?:
      | (() => sh_PropertyShape.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly and?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly classes?: string | NamedNode | readonly (string | NamedNode)[];
    readonly comment?: string | Maybe<string>;
    readonly datatype?: string | NamedNode | Maybe<NamedNode>;
    readonly deactivated?: boolean | Maybe<boolean>;
    readonly defaultValue?: (NamedNode | Literal) | Maybe<NamedNode | Literal>;
    readonly description?: string | Maybe<string>;
    readonly disjoint?: string | NamedNode | readonly (string | NamedNode)[];
    readonly display?: boolean;
    readonly equals?: string | NamedNode | readonly (string | NamedNode)[];
    readonly flags?: string | Maybe<string>;
    readonly groups?:
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly hasValues?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly ignore?: boolean;
    readonly in_?:
      | readonly (NamedNode | Literal)[]
      | Maybe<readonly (NamedNode | Literal)[]>;
    readonly isDefinedBy?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly label?: string | Maybe<string>;
    readonly languageIn?: readonly string[] | Maybe<readonly string[]>;
    readonly lessThan?: string | NamedNode | readonly (string | NamedNode)[];
    readonly lessThanOrEquals?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly maxCount?: bigint | Maybe<bigint>;
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
    readonly maxLength?: bigint | Maybe<bigint>;
    readonly message?: string | Maybe<string>;
    readonly minCount?: bigint | Maybe<bigint>;
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
    readonly minLength?: bigint | Maybe<bigint>;
    readonly mutable?: boolean | Maybe<boolean>;
    readonly name?: string | Maybe<string>;
    readonly node?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
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
      | BlankNode
      | NamedNode
      | string
      | readonly (BlankNode | NamedNode | string | undefined)[];
    readonly or?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
    readonly order?: number | Maybe<number>;
    readonly path: $PropertyPath;
    readonly pattern?: string | Maybe<string>;
    readonly qualifiedMaxCount?: bigint | Maybe<bigint>;
    readonly qualifiedMinCount?: bigint | Maybe<bigint>;
    readonly qualifiedValueShape?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly qualifiedValueShapesDisjoint?: boolean | Maybe<boolean>;
    readonly resolve?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly severity?:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity
      | Maybe<sh_Severity>;
    readonly shaclmateName?: string | Maybe<string>;
    readonly targetClasses?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetNodes?:
      | (NamedNode | Literal)
      | readonly (NamedNode | Literal)[];
    readonly targetObjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly targetSubjectsOf?:
      | string
      | NamedNode
      | readonly (string | NamedNode)[];
    readonly uniqueLang?: boolean | Maybe<boolean>;
    readonly xone?:
      | readonly (BlankNode | NamedNode | string | undefined)[]
      | Maybe<readonly (BlankNode | NamedNode)[]>;
  }): sh_PropertyShape {
    return create(parameters).unsafeCoerce();
  }

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
          return $PropertyPath.schema;
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
        $PropertyPath.toRdfResource(parameters.object.path, {
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

  export const $toString: (_shPropertyShape: sh_PropertyShape) => string = (
    _shPropertyShape,
  ) => `sh_PropertyShape(${JSON.stringify(toStringRecord(_shPropertyShape))})`;

  export const toStringRecord: (
    _shPropertyShape: sh_PropertyShape,
  ) => Record<string, string> = (_shPropertyShape) =>
    $compactRecord({
      $identifier: _shPropertyShape.$identifier().toString(),
      label: _shPropertyShape.label.map((item) => item.toString()).extract(),
      name: _shPropertyShape.name.map((item) => item.toString()).extract(),
      path: $PropertyPath.$toString(_shPropertyShape.path),
      shaclmateName: _shPropertyShape.shaclmateName
        .map((item) => item.toString())
        .extract(),
    });
}
export type sh_Severity = NamedNode<
  | "http://www.w3.org/ns/shacl#Info"
  | "http://www.w3.org/ns/shacl#Warning"
  | "http://www.w3.org/ns/shacl#Violation"
>;
export type sh_ValidationReport = {
  readonly $identifier: () => sh_ValidationReport.Identifier;

  readonly $type: "sh_ValidationReport";

  readonly conforms: boolean;

  readonly results: readonly sh_ValidationResult[];

  readonly shapesGraphWellFormed: Maybe<boolean>;
};

export namespace sh_ValidationReport {
  export const create: (parameters: {
    readonly $identifier?:
      | (() => sh_ValidationReport.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly conforms: boolean;
    readonly results?: sh_ValidationResult | readonly sh_ValidationResult[];
    readonly shapesGraphWellFormed?: boolean | Maybe<boolean>;
  }) => Either<Error, sh_ValidationReport> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier),
      conforms: Either.of(parameters.conforms),
      results: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters.results).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_ValidationReport.schema.properties.results.type,
          value,
        ),
      ),
      shapesGraphWellFormed: $convertToMaybe($identityConversionFunction)(
        parameters.shapesGraphWellFormed,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_ValidationReport.schema.properties.shapesGraphWellFormed.type,
          value,
        ),
      ),
    })
      .map((properties) => ({
        ...properties,
        $type: "sh_ValidationReport" as const,
      }))
      .map((object) =>
        $monkeyPatchObject(object, {
          $toString: sh_ValidationReport.$toString,
        }),
      );

  export function createUnsafe(parameters: {
    readonly $identifier?:
      | (() => sh_ValidationReport.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly conforms: boolean;
    readonly results?: sh_ValidationResult | readonly sh_ValidationResult[];
    readonly shapesGraphWellFormed?: boolean | Maybe<boolean>;
  }): sh_ValidationReport {
    return create(parameters).unsafeCoerce();
  }

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

  export const $toString: (_shValidationReport: sh_ValidationReport) => string =
    (_shValidationReport) =>
      `sh_ValidationReport(${JSON.stringify(toStringRecord(_shValidationReport))})`;

  export const toStringRecord: (
    _shValidationReport: sh_ValidationReport,
  ) => Record<string, string> = (_shValidationReport) =>
    $compactRecord({
      $identifier: _shValidationReport.$identifier().toString(),
    });
}
export type sh_ValidationResult = {
  readonly $identifier: () => sh_ValidationResult.Identifier;

  readonly $type: "sh_ValidationResult";

  readonly details: readonly (BlankNode | NamedNode | Literal)[];

  readonly focusNode: BlankNode | NamedNode | Literal;

  readonly message: Maybe<string>;

  readonly path: Maybe<$PropertyPath>;

  readonly severity: sh_Severity;

  readonly sourceConstraintComponent: NamedNode;

  readonly sourceShape: Maybe<BlankNode | NamedNode>;

  readonly value: Maybe<BlankNode | NamedNode | Literal>;
};

export namespace sh_ValidationResult {
  export const create: (parameters: {
    readonly $identifier?:
      | (() => sh_ValidationResult.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly details?:
      | (BlankNode | NamedNode | Literal)
      | readonly (BlankNode | NamedNode | Literal)[];
    readonly focusNode: BlankNode | NamedNode | Literal;
    readonly message?: string | Maybe<string>;
    readonly path?: $PropertyPath | Maybe<$PropertyPath>;
    readonly severity:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity;
    readonly sourceConstraintComponent: string | NamedNode;
    readonly sourceShape?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly value?:
      | (BlankNode | NamedNode | Literal)
      | Maybe<BlankNode | NamedNode | Literal>;
  }) => Either<Error, sh_ValidationResult> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(parameters.$identifier),
      details: $convertToScalarSet(
        $identityConversionFunction,
        true,
      )(parameters.details).chain((value) =>
        $validateArray($identityValidationFunction, true)(
          sh_ValidationResult.schema.properties.details.type,
          value,
        ),
      ),
      focusNode: Either.of(parameters.focusNode),
      message: $convertToMaybe($identityConversionFunction)(
        parameters.message,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_ValidationResult.schema.properties.message.type,
          value,
        ),
      ),
      path: $convertToMaybe($identityConversionFunction)(parameters.path).chain(
        (value) =>
          $validateMaybe($identityValidationFunction)(
            sh_ValidationResult.schema.properties.path.type,
            value,
          ),
      ),
      severity: $convertToIri<
        | "http://www.w3.org/ns/shacl#Info"
        | "http://www.w3.org/ns/shacl#Warning"
        | "http://www.w3.org/ns/shacl#Violation"
      >(parameters.severity),
      sourceConstraintComponent: $convertToIri<string>(
        parameters.sourceConstraintComponent,
      ),
      sourceShape: $convertToMaybe($convertToIdentifier)(
        parameters.sourceShape,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_ValidationResult.schema.properties.sourceShape.type,
          value,
        ),
      ),
      value: $convertToMaybe($identityConversionFunction)(
        parameters.value,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          sh_ValidationResult.schema.properties.value.type,
          value,
        ),
      ),
    })
      .map((properties) => ({
        ...properties,
        $type: "sh_ValidationResult" as const,
      }))
      .map((object) =>
        $monkeyPatchObject(object, {
          $toString: sh_ValidationResult.$toString,
        }),
      );

  export function createUnsafe(parameters: {
    readonly $identifier?:
      | (() => sh_ValidationResult.Identifier)
      | BlankNode
      | NamedNode
      | string;
    readonly details?:
      | (BlankNode | NamedNode | Literal)
      | readonly (BlankNode | NamedNode | Literal)[];
    readonly focusNode: BlankNode | NamedNode | Literal;
    readonly message?: string | Maybe<string>;
    readonly path?: $PropertyPath | Maybe<$PropertyPath>;
    readonly severity:
      | (
          | "http://www.w3.org/ns/shacl#Info"
          | "http://www.w3.org/ns/shacl#Warning"
          | "http://www.w3.org/ns/shacl#Violation"
        )
      | sh_Severity;
    readonly sourceConstraintComponent: string | NamedNode;
    readonly sourceShape?:
      | BlankNode
      | NamedNode
      | string
      | Maybe<BlankNode | NamedNode>;
    readonly value?:
      | (BlankNode | NamedNode | Literal)
      | Maybe<BlankNode | NamedNode | Literal>;
  }): sh_ValidationResult {
    return create(parameters).unsafeCoerce();
  }

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
              return $PropertyPath.schema;
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
        $PropertyPath.toRdfResource(value, {
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

  export const $toString: (_shValidationResult: sh_ValidationResult) => string =
    (_shValidationResult) =>
      `sh_ValidationResult(${JSON.stringify(toStringRecord(_shValidationResult))})`;

  export const toStringRecord: (
    _shValidationResult: sh_ValidationResult,
  ) => Record<string, string> = (_shValidationResult) =>
    $compactRecord({
      $identifier: _shValidationResult.$identifier().toString(),
    });
}
export type sh_Shape = sh_NodeShape | sh_PropertyShape;

export namespace sh_Shape {
  export const $toString = (value: sh_Shape): string => {
    if (sh_NodeShape.issh_NodeShape(value)) {
      return sh_NodeShape.$toString(value);
    }
    if (sh_PropertyShape.issh_PropertyShape(value)) {
      return sh_PropertyShape.$toString(value);
    }

    throw new Error("unable to serialize to string");
  };

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export function issh_Shape(object: $Object): object is sh_Shape {
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

  export const toRdfResource: $ToRdfResourceFunction<sh_Shape> = (
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
  }) satisfies $ToRdfResourceValuesFunction<sh_Shape>;
}
export type $Object =
  | sh_NodeShape
  | sh_Ontology
  | sh_PropertyGroup
  | sh_PropertyShape
  | sh_ValidationReport
  | sh_ValidationResult;

export namespace $Object {
  export const $toString = (value: $Object): string => {
    if (sh_NodeShape.issh_NodeShape(value)) {
      return sh_NodeShape.$toString(value);
    }
    if (sh_Ontology.issh_Ontology(value)) {
      return sh_Ontology.$toString(value);
    }
    if (sh_PropertyGroup.issh_PropertyGroup(value)) {
      return sh_PropertyGroup.$toString(value);
    }
    if (sh_PropertyShape.issh_PropertyShape(value)) {
      return sh_PropertyShape.$toString(value);
    }
    if (sh_ValidationReport.issh_ValidationReport(value)) {
      return sh_ValidationReport.$toString(value);
    }
    if (sh_ValidationResult.issh_ValidationResult(value)) {
      return sh_ValidationResult.$toString(value);
    }

    throw new Error("unable to serialize to string");
  };

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
