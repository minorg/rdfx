import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import {
  PropertyPath as RdfxResourcePropertyPath,
  Resource,
} from "@rdfx/resource";
import { NTriplesIdentifier, NTriplesTerm } from "@rdfx/string";
import { Either, Left, Maybe, Right } from "purify-ts";

type $_FromRdfResourceFunction<T> = (
  resource: Resource,
  options: {
    context: undefined | unknown;
    graph: Exclude<Quad_Graph, Variable> | undefined;
    ignoreRdfType: boolean;

    preferredLanguages: readonly string[] | undefined;
  },
) => Either<Error, T>;

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
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
> = (
  source: SourceT,
  defaultNamespace?: DefaultNamespaceT,
) => Either<Error, TargetT>;

function $convertToIdentifierProperty<
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
>(
  identifier:
    | (() => BlankNode | NamedNode)
    | BlankNode
    | NamedNode
    | (keyof DefaultNamespaceT & string)
    | undefined,
  defaultNamespace?: DefaultNamespaceT,
): Either<Error, () => BlankNode | NamedNode> {
  switch (typeof identifier) {
    case "function":
      return Either.of(identifier);
    case "object": {
      const captureIdentifier = identifier;
      return Either.of(() => captureIdentifier);
    }
    case "string": {
      const captureIdentifier = defaultNamespace
        ? defaultNamespace(identifier)
        : dataFactory.namedNode(identifier);
      return Either.of(() => captureIdentifier);
    }
    case "undefined": {
      const captureIdentifier = dataFactory.blankNode();
      return Either.of(() => captureIdentifier);
    }
  }
}

function $convertToIriIdentifierProperty<
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
>(
  identifier:
    | (() => NamedNode)
    | NamedNode
    | (keyof DefaultNamespaceT & string),
  defaultNamespace?: DefaultNamespaceT,
): Either<Error, () => NamedNode> {
  switch (typeof identifier) {
    case "function":
      return Either.of(identifier);
    case "object": {
      const captureIdentifier = identifier;
      return Either.of(() => captureIdentifier);
    }
    case "string": {
      const captureIdentifier = defaultNamespace
        ? defaultNamespace(identifier)
        : dataFactory.namedNode(identifier);
      return Either.of(() => captureIdentifier);
    }
  }
}

function $convertToMaybe<
  DefaultNamespaceT extends $NamespaceBuilder,
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
  return (value, defaultNamespace) => {
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

    return convertToItem(value, defaultNamespace).map(Maybe.of);
  };
}

function $ensureRdfResourceType(
  resource: Resource,
  types: readonly NamedNode[],
  options: { graph: Exclude<Quad_Graph, Variable> | undefined },
): Either<Error, undefined> {
  return resource
    .value($RdfVocabularies.rdf.type, options)
    .chain((actualRdfTypeValue) => actualRdfTypeValue.toIri())
    .chain((actualRdfType) => {
      // Check the expected type and its known subtypes
      for (const type of types) {
        if (resource.isInstanceOf(type, options)) {
          return Right(undefined);
        }
      }

      return Left(
        new Error(
          `${resource.identifier} has unexpected RDF type (actual: ${actualRdfType}, expected one of ${types})`,
        ),
      );
    });
}

export type $FromRdfResourceFunction<T> = (
  resource: Resource,
  options?: {
    context?: unknown;
    graph?: Exclude<Quad_Graph, Variable>;
    ignoreRdfType?: boolean;

    preferredLanguages?: readonly string[];
  },
) => Either<Error, T>;

export type $FromRdfResourceValuesFunction<ValueT, ValueSchemaT> = (
  resourceValues: Resource.Values,
  options: {
    context?: unknown;
    graph?: Exclude<Quad_Graph, Variable>;
    focusResource: Resource;
    ignoreRdfType?: boolean;

    preferredLanguages?: readonly string[];
    propertyPath: $PropertyPath;
    schema: ValueSchemaT;
  },
) => Either<Error, Resource.Values<ValueT>>;

function $identifierFromRdfResourceValues(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<BlankNode | NamedNode, $IdentifierSchema>
  >[1],
): Either<Error, Resource.Values<BlankNode | NamedNode>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) => value.toIdentifier()),
  );
}

interface $IdentifierSchema {
  readonly hasValues?: readonly NamedNode[];
  readonly kind: "Identifier";
}

function $identityConversionFunction<T>(
  value: T,
  _defaultNamespace?: $NamespaceBuilder,
): Either<Error, T> {
  return Either.of(value);
}

function $identityValidationFunction<T>(
  _schema: unknown,
  value: T,
): Either<Error, T> {
  return Either.of(value);
}

function $iriFromRdfResourceValues<IriT extends string = string>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<NamedNode<IriT>, $IriSchema<IriT>>
  >[1],
): Either<Error, Resource.Values<NamedNode<IriT>>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toIri(options.schema.in)
        : (value.toIri() as Either<Error, NamedNode<IriT>>),
    ),
  );
}

interface $IriSchema<IriT extends string = string> {
  readonly hasValues?: readonly NamedNode[];
  readonly in?: readonly NamedNode<IriT>[];
  readonly kind: "Iri";
}

function $maybeFromRdfResourceValues<ItemT, ItemSchemaT>(
  itemFromRdfResourceValues: $FromRdfResourceValuesFunction<ItemT, ItemSchemaT>,
): $FromRdfResourceValuesFunction<Maybe<ItemT>, $MaybeSchema<ItemSchemaT>> {
  return (values, options) =>
    itemFromRdfResourceValues(values, {
      ...options,
      schema: options.schema.itemType,
    }).map((values) =>
      values.length > 0
        ? values.map((value) => Maybe.of(value))
        : Resource.Values.fromValue<Maybe<ItemT>>({
            focusResource: options.focusResource,
            propertyPath: options.propertyPath,
            value: Maybe.empty(),
          }),
    );
}

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

/**
 * NamespaceBuilder type excerpted from @rdfjs/namespace (MIT license) in lieu of a type import.
 */
type $NamespaceBuilder<TermNames extends string = any> = Record<
  TermNames,
  NamedNode
> &
  ((property?: TemplateStringsArray | TermNames) => NamedNode);

const $parseIdentifier = NTriplesIdentifier.parser(dataFactory);

export function $parseIri(identifier: string): Either<Error, NamedNode> {
  return $parseIdentifier(identifier).chain((identifier) =>
    identifier.termType === "NamedNode"
      ? Right(identifier)
      : Left(new Error("expected identifier to be NamedNode")),
  ) as Either<Error, NamedNode>;
}

export type $PropertyPath = RdfxResourcePropertyPath;

export namespace $PropertyPath {
  export const fromRdfResource: $FromRdfResourceFunction<$PropertyPath> =
    RdfxResourcePropertyPath.fromResource;

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    $PropertyPath,
    object
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) => fromRdfResource(resource, options)),
    );

  export const schema: Readonly<object> = {};

  export type Schema = typeof schema;

  export const $toString = RdfxResourcePropertyPath.toString;
}

function $rdfResourceIdentifierValues(resource: Resource): Resource.Values {
  return new Resource.Value({
    dataFactory: dataFactory,
    focusResource: resource,
    propertyPath: $RdfVocabularies.rdf.subject,
    term: resource.identifier,
  }).toValues();
}

namespace $RdfVocabularies {
  export const rdf = {
    first: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
    ),
    langString: dataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
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
    dateTimeStamp: dataFactory.namedNode(
      "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
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

function $shaclPropertyFromRdf<TypeT, TypeSchemaT>({
  focusResource,
  graph,
  propertySchema,
  typeFromRdfResourceValues,
  ...otherParameters
}: {
  propertySchema: $ShaclPropertySchema<TypeSchemaT>;
  typeFromRdfResourceValues: $FromRdfResourceValuesFunction<TypeT, TypeSchemaT>;
} & Omit<
  Parameters<$FromRdfResourceValuesFunction<TypeT, TypeSchemaT>>[1],
  "propertyPath" | "schema"
>): Either<Error, TypeT> {
  return typeFromRdfResourceValues(
    focusResource.values(propertySchema.path, { graph, unique: true }),
    {
      ...otherParameters,
      focusResource,
      graph,
      propertyPath: propertySchema.path,
      schema: propertySchema.type,
    },
  ).chain((values) => values.head());
}

export interface $ShaclPropertySchema<TypeSchemaT> {
  readonly kind: "Shacl";
  readonly path: $PropertyPath;
  readonly type: TypeSchemaT;
}

function $stringFromRdfResourceValues<StringT extends string>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<StringT, $StringSchema<StringT>>
  >[1],
): Either<Error, Resource.Values<StringT>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toString(options.schema.in)
        : (value.toString() as Either<Error, StringT>),
    ),
  );
}

interface $StringSchema<StringT extends string> {
  readonly hasValues?: readonly Literal[];
  readonly in?: readonly StringT[];
  readonly languageIn?: readonly string[];
  readonly kind: "String";
}

const $termLikeFromRdfResourceValues: $FromRdfResourceValuesFunction<
  Resource.Value,
  {
    readonly hasValues?: readonly (Literal | NamedNode)[];
    readonly languageIn?: readonly string[];
  }
> = (values, { preferredLanguages, schema: { hasValues, languageIn } }) => {
  let chain = Either.of<Error, Resource.Values>(values);

  if (hasValues && hasValues.length > 0) {
    chain = chain.chain((values) =>
      Either.sequence(
        hasValues.map((hasValue) =>
          values.find((value) => value.term.equals(hasValue)),
        ),
      ).map(() => values),
    );
  }

  if (languageIn && languageIn.length > 0) {
    chain = chain.chain((values) =>
      values.chainMap((value) =>
        value.toLiteral().chain((literal) =>
          languageIn.includes(literal.language)
            ? Right(value)
            : Left(
                new Resource.MistypedValueError({
                  actualValue: literal,
                  expectedValueType: "Literal",
                  focusResource: value.focusResource,
                  propertyPath: value.propertyPath,
                }),
              ),
        ),
      ),
    );
  }

  if (preferredLanguages && preferredLanguages.length > 0) {
    chain = chain.chain((values) => {
      const literals: Literal[] = [];
      const literalValues: Resource.Value[] = [];
      const nonLiteralValues: Resource.Value[] = [];

      for (const value of values) {
        const term = value.toTerm().unsafeCoerce();
        if (term.termType === "Literal") {
          literals.push(term);
          literalValues.push(value);
        } else {
          nonLiteralValues.push(value);
        }
      }

      // Return all literals for the first preferredLanguage, then all literals for the second preferredLanguage, etc.
      // Within a preferredLanguage the literals may be in any order.
      const preferredLanguageLiteralValues: Resource.Value[] = [];
      for (const preferredLanguage of preferredLanguages) {
        for (let literalI = 0; literalI < literals.length; literalI++) {
          if (literals[literalI].language === preferredLanguage) {
            preferredLanguageLiteralValues.push(literalValues[literalI]);
          }
        }
      }

      return Right(
        Resource.Values.fromArray({
          focusResource: values.focusResource,
          propertyPath: values.propertyPath,
          values: nonLiteralValues.concat(preferredLanguageLiteralValues),
        }),
      );
    });
  }

  return chain;
};

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

function $wrap_FromRdfResourceFunction<T>(
  _fromRdfResourceFunction: $_FromRdfResourceFunction<T>,
): $FromRdfResourceFunction<T> {
  return (resource, options) => {
    const {
      context,
      graph,
      ignoreRdfType = false,
      preferredLanguages,
    } = options ?? {};
    return _fromRdfResourceFunction(resource, {
      context,
      graph,
      ignoreRdfType,
      preferredLanguages,
    });
  };
}
export type NodeShape1 = {
  readonly $identifier: () => NodeShape1.Identifier;

  readonly $type: "NodeShape1";

  readonly stringProperty: string;
};

export namespace NodeShape1 {
  export const _fromRdfResource: $_FromRdfResourceFunction<NodeShape1> = (
    resource,
    options,
  ) =>
    (!options.ignoreRdfType
      ? $ensureRdfResourceType(resource, [NodeShape1.schema.fromRdfType], {
          graph: options.graph,
        })
      : Right(true as const)
    ).chain((_rdfTypeCheck) =>
      $sequenceRecord({
        $identifier: $iriFromRdfResourceValues<string>(
          $rdfResourceIdentifierValues(resource),
          {
            ...options,
            focusResource: resource,
            propertyPath: $RdfVocabularies.rdf.subject,
            schema: NodeShape1.schema.properties.$identifier.type,
          },
        ).chain((values) => values.head()),
        stringProperty: $shaclPropertyFromRdf<string, $StringSchema<string>>({
          ...options,
          focusResource: resource,
          ignoreRdfType: true,
          propertySchema: NodeShape1.schema.properties.stringProperty,
          typeFromRdfResourceValues: $stringFromRdfResourceValues<string>,
        }),
      }).chain((properties) => NodeShape1.create(properties)),
    );

  export const $toString: (_nodeShape1: NodeShape1) => string = (_nodeShape1) =>
    `NodeShape1(${JSON.stringify(toStringRecord(_nodeShape1))})`;

  export const create = <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(parameters: {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => NodeShape1.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly stringProperty: string;
  }): Either<Error, NodeShape1> =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(
        parameters.$identifier,
        parameters.$defaultNamespace,
      ),
      stringProperty: Either.of(parameters.stringProperty),
    })
      .map((properties) => ({ ...properties, $type: "NodeShape1" as const }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: NodeShape1.$toString }),
      );

  export function createUnsafe<
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(parameters: {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => NodeShape1.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly stringProperty: string;
  }): NodeShape1 {
    return create(parameters).unsafeCoerce();
  }

  export const fromRdfResource =
    $wrap_FromRdfResourceFunction(_fromRdfResource);

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    NodeShape1,
    NodeShape1.Schema
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) => fromRdfResource(resource, options)),
    );

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
    export const stringify = NTriplesTerm.stringify;
  }

  export const isNodeShape1 = (object: $Object): object is NodeShape1 =>
    object.$type === "NodeShape1";

  export const schema = {
    fromRdfType: dataFactory.namedNode("http://example.com/NodeShape1"),
    properties: {
      $identifier: { kind: "Identifier", type: { kind: "Iri" as const } },
      $type: { kind: "Discriminant", value: "NodeShape1" },
      stringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/stringProperty"),
        type: { kind: "String" as const },
      },
    },
    toRdfTypes: [dataFactory.namedNode("http://example.com/NodeShape1")],
  } as const;

  export type Schema = typeof schema;

  export const toStringRecord: (
    _nodeShape1: NodeShape1,
  ) => Record<string, string> = (_nodeShape1) =>
    $compactRecord({ $identifier: _nodeShape1.$identifier().toString() });
}
export type NodeShape2 = {
  readonly $identifier: () => NodeShape2.Identifier;

  readonly $type: "NodeShape2";

  readonly stringProperty: Maybe<string>;
};

export namespace NodeShape2 {
  export const _fromRdfResource: $_FromRdfResourceFunction<NodeShape2> = (
    resource,
    options,
  ) =>
    (!options.ignoreRdfType
      ? $ensureRdfResourceType(resource, [NodeShape2.schema.fromRdfType], {
          graph: options.graph,
        })
      : Right(true as const)
    ).chain((_rdfTypeCheck) =>
      $sequenceRecord({
        $identifier: $identifierFromRdfResourceValues(
          $rdfResourceIdentifierValues(resource),
          {
            ...options,
            focusResource: resource,
            propertyPath: $RdfVocabularies.rdf.subject,
            schema: NodeShape2.schema.properties.$identifier.type,
          },
        ).chain((values) => values.head()),
        stringProperty: $shaclPropertyFromRdf<
          Maybe<string>,
          $MaybeSchema<$StringSchema<string>>
        >({
          ...options,
          focusResource: resource,
          ignoreRdfType: true,
          propertySchema: NodeShape2.schema.properties.stringProperty,
          typeFromRdfResourceValues: $maybeFromRdfResourceValues<
            string,
            $StringSchema<string>
          >($stringFromRdfResourceValues<string>),
        }),
      }).chain((properties) => NodeShape2.create(properties)),
    );

  export const $toString: (_nodeShape2: NodeShape2) => string = (_nodeShape2) =>
    `NodeShape2(${JSON.stringify(toStringRecord(_nodeShape2))})`;

  export const create = <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(parameters?: {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => NodeShape2.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly stringProperty?: string | Maybe<string>;
  }): Either<Error, NodeShape2> =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(
        parameters?.$identifier,
        parameters?.$defaultNamespace,
      ),
      stringProperty: $convertToMaybe($identityConversionFunction)(
        parameters?.stringProperty,
        parameters?.$defaultNamespace,
      ).chain((value) =>
        $validateMaybe($identityValidationFunction)(
          NodeShape2.schema.properties.stringProperty.type,
          value,
        ),
      ),
    })
      .map((properties) => ({ ...properties, $type: "NodeShape2" as const }))
      .map((object) =>
        $monkeyPatchObject(object, { $toString: NodeShape2.$toString }),
      );

  export function createUnsafe<
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(parameters?: {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => NodeShape2.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly stringProperty?: string | Maybe<string>;
  }): NodeShape2 {
    return create(parameters).unsafeCoerce();
  }

  export const fromRdfResource =
    $wrap_FromRdfResourceFunction(_fromRdfResource);

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    NodeShape2,
    NodeShape2.Schema
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) => fromRdfResource(resource, options)),
    );

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
    export const stringify = NTriplesTerm.stringify;
  }

  export const isNodeShape2 = (object: $Object): object is NodeShape2 =>
    object.$type === "NodeShape2";

  export const schema = {
    fromRdfType: dataFactory.namedNode("http://example.com/NodeShape2"),
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      $type: { kind: "Discriminant", value: "NodeShape2" },
      stringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/stringProperty"),
        type: {
          kind: "Option" as const,
          itemType: { kind: "String" as const },
        },
      },
    },
    toRdfTypes: [dataFactory.namedNode("http://example.com/NodeShape2")],
  } as const;

  export type Schema = typeof schema;

  export const toStringRecord: (
    _nodeShape2: NodeShape2,
  ) => Record<string, string> = (_nodeShape2) =>
    $compactRecord({ $identifier: _nodeShape2.$identifier().toString() });
}
export type $Object = NodeShape1 | NodeShape2;

export namespace $Object {
  export function $toString(object: $Object) {
    switch (object.$type) {
      case "NodeShape1":
        return NodeShape1.$toString(object);
      case "NodeShape2":
        return NodeShape2.$toString(object);
      default:
        object satisfies never;
        throw new Error("should never reach this point");
    }
  }
}
