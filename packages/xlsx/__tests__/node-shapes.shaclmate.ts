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
import { NTriplesIdentifier } from "@rdfx/string";
import { Either, Left, Right } from "purify-ts";

type $_FromRdfResourceFunction<T> = (
  resource: Resource,
  options: {
    context: undefined | unknown;
    graph: Exclude<Quad_Graph, Variable> | undefined;
    ignoreRdfType: boolean;

    preferredLanguages: readonly string[] | undefined;
  },
) => Either<Error, T>;

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

function $convertToIri<
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
>(
  value: NamedNode | (keyof DefaultNamespaceT & string),
  defaultNamespace?: DefaultNamespaceT,
): Either<Error, NamedNode> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return Either.of(
        defaultNamespace
          ? defaultNamespace(value)
          : dataFactory.namedNode(value),
      );
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

const $convertToLangString: $ConversionFunction<Literal, Literal> = (value) => {
  if (!value.datatype.equals($rdf_langString)) {
    return Left(
      new Error(
        `expected Literal to have rdf:langString datatype, not ${value.datatype.value}`,
      ),
    );
  }

  if (value.language.length === 0) {
    return Left(new Error("expected Literal to have non-empty language"));
  }

  return Either.of(value);
};

function $convertToLazy<PartialT, ResolvedT>(
  resolvedToPartial: (resolved: ResolvedT) => PartialT,
): $ConversionFunction<
  $Lazy<PartialT, ResolvedT> | ResolvedT,
  $Lazy<PartialT, ResolvedT>
> {
  return (value) => {
    if (value instanceof $Lazy) {
      return Either.of(value);
    }

    const resolved = value as ResolvedT;
    return Either.of(
      new $Lazy({
        partial: resolvedToPartial(resolved),
        resolver: async () => Right(resolved),
      }),
    );
  };
}

function $convertToScalarSet<
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
  ItemSourceT | readonly ItemSourceT[] | undefined,
  readonly ItemTargetT[],
  DefaultNamespaceT
> {
  return (value, defaultNamespace) => {
    if (typeof value === "undefined") {
      return Either.of<Error, readonly ItemTargetT[]>(
        [] as unknown as readonly ItemTargetT[],
      );
    }
    if (Array.isArray(value)) {
      return Either.sequence(
        value.map((value) => convertToItem(value, defaultNamespace)),
      ) as Either<Error, readonly ItemTargetT[]>;
    }
    return convertToItem(value as ItemSourceT).map((value) => [
      value,
    ]) as Either<Error, readonly ItemTargetT[]>;
  };
}

function $ensureRdfResourceType(
  resource: Resource,
  types: readonly NamedNode[],
  options: { graph: Exclude<Quad_Graph, Variable> | undefined },
): Either<Error, undefined> {
  return resource
    .value($rdf_type, options)
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

const $identifierFromRdfResourceValues: $FromRdfResourceValuesFunction<
  BlankNode | NamedNode,
  $IdentifierSchema
> = (values, options) =>
  $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) => value.toIdentifier()),
  );

interface $IdentifierSchema {
  readonly hasValues?: readonly NamedNode[];
  readonly kind: "Identifier";
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

const $langStringFromRdfResourceValues: $FromRdfResourceValuesFunction<
  Literal,
  $LangStringSchema
> = (values, options) =>
  $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) => value.toLangString(options.schema.in)),
  );

type $LangStringSchema = Omit<$LiteralSchema, "kind"> & {
  readonly kind: "LangString";
};

/**
 * Type of lazy properties that return a single required value. This is a class instead of an interface so it can be instanceof'd elsewhere.
 */
export class $Lazy<PartialT, ResolvedT> {
  readonly partial: PartialT;
  private readonly resolver: (
    partial: PartialT,
    options?: { preferredLanguages?: readonly string[] },
  ) => Promise<Either<Error, ResolvedT>>;

  constructor({
    partial,
    resolver,
  }: {
    partial: PartialT;
    resolver: (
      partial: PartialT,
      options?: { preferredLanguages?: readonly string[] },
    ) => Promise<Either<Error, ResolvedT>>;
  }) {
    this.partial = partial;
    this.resolver = resolver;
  }

  static fromPartial<PartialT, ResolvedT>(
    partial: PartialT,
  ): $Lazy<PartialT, ResolvedT> {
    return new $Lazy({ partial, resolver: $missingResolver<ResolvedT> });
  }

  resolve(options?: {
    preferredLanguages?: readonly string[];
  }): Promise<Either<Error, ResolvedT>> {
    return this.resolver(this.partial, options);
  }
}

interface $LiteralSchema {
  readonly hasValues?: readonly Literal[];
  readonly in?: readonly Literal[];
  readonly kind: "Literal";
  readonly languageIn?: readonly string[];
}

async function $missingResolver<ResolvedT>(): Promise<
  Either<Error, ResolvedT>
> {
  return Left(new Error("unable to resolve partial"));
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
export type $NamespaceBuilder<TermNames extends string = any> = Record<
  TermNames,
  NamedNode
> &
  ((property?: TemplateStringsArray | TermNames) => NamedNode);

export type $ObjectTypeGuardFunction<ObjectT extends $Object> = (
  object: $Object,
) => object is ObjectT;

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

const $rdf_langString = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
);

const $rdf_subject = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
);

const $rdf_type = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
);

function $rdfResourceIdentifierValues(resource: Resource): Resource.Values {
  return new Resource.Value({
    dataFactory: dataFactory,
    focusResource: resource,
    propertyPath: $rdf_subject,
    term: resource.identifier,
  }).toValues();
}

const $rdfs_label = dataFactory.namedNode(
  "http://www.w3.org/2000/01/rdf-schema#label",
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

function $setFromRdfResourceValues<ItemT, ItemSchemaT>(
  itemFromRdfResourceValues: $FromRdfResourceValuesFunction<ItemT, ItemSchemaT>,
): $FromRdfResourceValuesFunction<
  readonly ItemT[],
  $CollectionSchema<ItemSchemaT>
> {
  return (values, options) =>
    itemFromRdfResourceValues(values, {
      ...options,
      schema: options.schema.itemType,
    })
      .map((values) => values.toArray())
      .map((valuesArray) =>
        Resource.Values.fromValue({
          focusResource: options.focusResource,
          propertyPath: options.propertyPath,
          value: valuesArray,
        }),
      );
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
  readonly datatype: NamedNode;
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

export type $ToStringFunction<T> = (value: T) => string;

export type $ToStringRecordFunction<T> = (value: T) => Record<string, string>;

function $validateArray<ItemSchemaT, ItemValueT>(
  validateItem: $ValidationFunction<ItemSchemaT, ItemValueT>,
): $ValidationFunction<$CollectionSchema<ItemSchemaT>, readonly ItemValueT[]> {
  return (schema, valueArray) => {
    if (schema.minCount !== undefined && valueArray.length < schema.minCount) {
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

const $xsd_string = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#string",
);

export type $DefaultPartial = {
  readonly $identifier: () => $DefaultPartial.Identifier;
};

export namespace $DefaultPartial {
  export const _fromRdfResource: $_FromRdfResourceFunction<
    $DefaultPartial.Discriminated
  > = (resource, options) =>
    $sequenceRecord({
      $identifier: $identifierFromRdfResourceValues(
        $rdfResourceIdentifierValues(resource),
        {
          ...options,
          focusResource: resource,
          propertyPath: $rdf_subject,
          schema: $DefaultPartial.schema.properties.$identifier.type,
        },
      ).chain((values) => values.head()),
    }).chain((properties) => $DefaultPartial.create(properties));

  export const $toString: $ToStringFunction<$DefaultPartial> = (
    _defaultPartial,
  ) =>
    `$DefaultPartial(${JSON.stringify($DefaultPartial.toStringRecord(_defaultPartial))})`;

  export const create: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters?: $DefaultPartial.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, $DefaultPartial.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(
        parameters.$identifier,
        parameters.$defaultNamespace,
      ),
      $type: Right("DefaultPartial" as const),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: $DefaultPartial.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => $DefaultPartial.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters?: $DefaultPartial.CreateParameters<$DefaultNamespaceT>,
  ) => $DefaultPartial.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = $DefaultPartial & {
    readonly $type: "DefaultPartial";
  };

  export const fromRdfResource: $FromRdfResourceFunction<$DefaultPartial.Discriminated> =
    $wrap_FromRdfResourceFunction($DefaultPartial._fromRdfResource);

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    $DefaultPartial.Discriminated,
    $DefaultPartial.Schema
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) =>
          $DefaultPartial.fromRdfResource(resource, options),
        ),
    );

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
  }

  export const is$DefaultPartial: $ObjectTypeGuardFunction<
    $DefaultPartial.Discriminated
  > = (object): object is $DefaultPartial.Discriminated =>
    object.$type === "DefaultPartial";

  export const schema = {
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
    },
  } as const;

  export type Schema = typeof schema;

  export const toStringRecord: $ToStringRecordFunction<$DefaultPartial> = (
    _defaultPartial,
  ) =>
    $compactRecord({ $identifier: _defaultPartial.$identifier().toString() });
}

export type NodeShape1 = {
  readonly $identifier: () => NodeShape1.Identifier;

  readonly iriProperty: NamedNode;

  readonly langStringProperty: readonly Literal[];

  readonly nodeProperty: $Lazy<$DefaultPartial, NodeShape2>;

  readonly stringProperty: string;
};

export namespace NodeShape1 {
  export const _fromRdfResource: $_FromRdfResourceFunction<
    NodeShape1.Discriminated
  > = (resource, options) =>
    $sequenceRecord({
      $identifier: $iriFromRdfResourceValues<string>(
        $rdfResourceIdentifierValues(resource),
        {
          ...options,
          focusResource: resource,
          propertyPath: $rdf_subject,
          schema: NodeShape1.schema.properties.$identifier.type,
        },
      ).chain((values) => values.head()),
      $rdfType: !options.ignoreRdfType
        ? $ensureRdfResourceType(
            resource,
            [NodeShape1.schema.properties.$rdfType.fromRdfType],
            {
              graph: options.graph,
            },
          )
        : Right(true as const),
      iriProperty: $shaclPropertyFromRdf<NamedNode, $IriSchema<string>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.iriProperty,
        typeFromRdfResourceValues: $iriFromRdfResourceValues<string>,
      }),
      langStringProperty: $shaclPropertyFromRdf<
        readonly Literal[],
        $CollectionSchema<$LangStringSchema>
      >({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.langStringProperty,
        typeFromRdfResourceValues: $setFromRdfResourceValues<
          Literal,
          $LangStringSchema
        >($langStringFromRdfResourceValues),
      }),
      nodeProperty: $shaclPropertyFromRdf<
        $Lazy<$DefaultPartial, NodeShape2>,
        { kind: "Lazy"; partialType: $DefaultPartial.Schema }
      >({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.nodeProperty,
        typeFromRdfResourceValues: (values, fromRdfResourceValuesOptions) =>
          $DefaultPartial
            .fromRdfResourceValues(values, {
              ...fromRdfResourceValuesOptions,
              schema: fromRdfResourceValuesOptions.schema.partialType,
            })
            .map((values) =>
              values.map(
                (partial) =>
                  new $Lazy<$DefaultPartial, NodeShape2>({
                    partial,
                    resolver: $missingResolver,
                  }),
              ),
            ),
      }),
      stringProperty: $shaclPropertyFromRdf<string, $StringSchema<string>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.stringProperty,
        typeFromRdfResourceValues: $stringFromRdfResourceValues<string>,
      }),
    }).chain((properties) => NodeShape1.create(properties));

  export const $toString: $ToStringFunction<Pick<NodeShape1, "$identifier">> = (
    _nodeShape1,
  ) => `NodeShape1(${JSON.stringify(NodeShape1.toStringRecord(_nodeShape1))})`;

  export const create: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters: NodeShape1.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, NodeShape1.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIriIdentifierProperty(
        parameters.$identifier,
        parameters.$defaultNamespace,
      ),
      $type: Right("NodeShape1" as const),
      iriProperty: $convertToIri(
        parameters.iriProperty,
        parameters.$defaultNamespace,
      ),
      langStringProperty: $convertToScalarSet($convertToLangString)(
        parameters.langStringProperty,
        parameters.$defaultNamespace,
      ).chain((value) =>
        $validateArray($identityValidationFunction)(
          NodeShape1.schema.properties.langStringProperty.type,
          value,
        ),
      ),
      nodeProperty: $convertToLazy<$DefaultPartial, NodeShape2>(
        $DefaultPartial.createUnsafe,
      )(parameters.nodeProperty, parameters.$defaultNamespace),
      stringProperty: Either.of(parameters.stringProperty),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: NodeShape1.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier:
      | (() => NodeShape1.Identifier)
      | (keyof $DefaultNamespaceT & string)
      | NamedNode;
    readonly iriProperty: (keyof $DefaultNamespaceT & string) | NamedNode;
    readonly langStringProperty: Literal | readonly Literal[];
    readonly nodeProperty: $Lazy<$DefaultPartial, NodeShape2> | NodeShape2;
    readonly stringProperty: string;
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters: NodeShape1.CreateParameters<$DefaultNamespaceT>,
  ) => NodeShape1.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = NodeShape1 & { readonly $type: "NodeShape1" };

  export const fromRdfResource: $FromRdfResourceFunction<NodeShape1.Discriminated> =
    $wrap_FromRdfResourceFunction(NodeShape1._fromRdfResource);

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    NodeShape1.Discriminated,
    NodeShape1.Schema
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) => NodeShape1.fromRdfResource(resource, options)),
    );

  export type Identifier = NamedNode;
  export namespace Identifier {
    export const parse = $parseIri;
  }

  export const isNodeShape1: $ObjectTypeGuardFunction<
    NodeShape1.Discriminated
  > = (object): object is NodeShape1.Discriminated =>
    object.$type === "NodeShape1";

  export const schema = {
    properties: {
      $identifier: { kind: "Identifier", type: { kind: "Iri" as const } },
      $rdfType: {
        fromRdfType: dataFactory.namedNode("http://example.com/NodeShape1"),
        kind: "RdfType",
        toRdfTypes: [dataFactory.namedNode("http://example.com/NodeShape1")],
      },
      iriProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/iriProperty"),
        type: { kind: "Iri" as const },
      },
      langStringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/langStringProperty"),
        type: {
          kind: "Set" as const,
          itemType: { kind: "LangString" as const },
          minCount: 1,
        },
      },
      nodeProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/nodeProperty"),
        get type() {
          return {
            kind: "Lazy" as const,
            get partialType() {
              return $DefaultPartial.schema;
            },
          };
        },
      },
      stringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/stringProperty"),
        type: { kind: "String" as const, datatype: $xsd_string },
      },
    },
  } as const;

  export type Schema = typeof schema;

  export const toStringRecord: $ToStringRecordFunction<
    Pick<NodeShape1, "$identifier">
  > = (_nodeShape1) =>
    $compactRecord({ $identifier: _nodeShape1.$identifier().toString() });
}

export type NodeShape2 = {
  readonly $identifier: () => NodeShape2.Identifier;
  readonly labels: readonly Literal[];
};

export namespace NodeShape2 {
  export const _fromRdfResource: $_FromRdfResourceFunction<
    NodeShape2.Discriminated
  > = (resource, options) =>
    $sequenceRecord({
      $identifier: $identifierFromRdfResourceValues(
        $rdfResourceIdentifierValues(resource),
        {
          ...options,
          focusResource: resource,
          propertyPath: $rdf_subject,
          schema: NodeShape2.schema.properties.$identifier.type,
        },
      ).chain((values) => values.head()),
      $rdfType: !options.ignoreRdfType
        ? $ensureRdfResourceType(
            resource,
            [NodeShape2.schema.properties.$rdfType.fromRdfType],
            {
              graph: options.graph,
            },
          )
        : Right(true as const),
      labels: $shaclPropertyFromRdf<
        readonly Literal[],
        $CollectionSchema<$LangStringSchema>
      >({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape2.schema.properties.labels,
        typeFromRdfResourceValues: $setFromRdfResourceValues<
          Literal,
          $LangStringSchema
        >($langStringFromRdfResourceValues),
      }),
    }).chain((properties) => NodeShape2.create(properties));

  export const $toString: $ToStringFunction<Pick<NodeShape2, "$identifier">> = (
    _nodeShape2,
  ) => `NodeShape2(${JSON.stringify(NodeShape2.toStringRecord(_nodeShape2))})`;

  export const create: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters?: NodeShape2.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, NodeShape2.Discriminated> = (parameters = {}) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(
        parameters.$identifier,
        parameters.$defaultNamespace,
      ),
      $type: Right("NodeShape2" as const),
      labels: $convertToScalarSet($convertToLangString)(
        parameters.labels,
        parameters.$defaultNamespace,
      ).chain((value) =>
        $validateArray($identityValidationFunction)(
          NodeShape2.schema.properties.labels.type,
          value,
        ),
      ),
    }).map((object) =>
      $monkeyPatchObject(object, { $toString: NodeShape2.$toString }),
    );

  export type CreateParameters<
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  > = {
    readonly $defaultNamespace?: $DefaultNamespaceT;
    readonly $identifier?:
      | (() => NodeShape2.Identifier)
      | BlankNode
      | NamedNode
      | (keyof $DefaultNamespaceT & string);
    readonly labels?: Literal | readonly Literal[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters?: NodeShape2.CreateParameters<$DefaultNamespaceT>,
  ) => NodeShape2.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = NodeShape2 & { readonly $type: "NodeShape2" };

  export const fromRdfResource: $FromRdfResourceFunction<NodeShape2.Discriminated> =
    $wrap_FromRdfResourceFunction(NodeShape2._fromRdfResource);

  export const fromRdfResourceValues: $FromRdfResourceValuesFunction<
    NodeShape2.Discriminated,
    NodeShape2.Schema
  > = (values, options) =>
    values.chainMap((value) =>
      value
        .toResource()
        .chain((resource) => NodeShape2.fromRdfResource(resource, options)),
    );

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
  }

  export const isNodeShape2: $ObjectTypeGuardFunction<
    NodeShape2.Discriminated
  > = (object): object is NodeShape2.Discriminated =>
    object.$type === "NodeShape2";

  export const schema = {
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
      $rdfType: {
        fromRdfType: dataFactory.namedNode("http://example.com/NodeShape2"),
        kind: "RdfType",
        toRdfTypes: [dataFactory.namedNode("http://example.com/NodeShape2")],
      },
      labels: {
        kind: "Shacl",
        path: $rdfs_label,
        type: {
          kind: "Set" as const,
          itemType: { kind: "LangString" as const },
        },
      },
    },
  } as const;

  export type Schema = typeof schema;

  export const toStringRecord: $ToStringRecordFunction<
    Pick<NodeShape2, "$identifier">
  > = (_nodeShape2) =>
    $compactRecord({ $identifier: _nodeShape2.$identifier().toString() });
}

export type $Object =
  | $DefaultPartial.Discriminated
  | NodeShape1.Discriminated
  | NodeShape2.Discriminated;

export namespace $Object {
  export function $toString(object: $Object) {
    switch (object.$type) {
      case "DefaultPartial":
        return $DefaultPartial.$toString(object);
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
