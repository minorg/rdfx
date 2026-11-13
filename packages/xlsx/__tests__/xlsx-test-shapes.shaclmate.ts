import type {
  BlankNode,
  DatasetCore,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";
import { datasetFactory, type PrefixMap } from "@rdfx/collection";
import { expandIri } from "@rdfx/curie";
import dataFactory from "@rdfx/data-factory";
import { LiteralFactory } from "@rdfx/literal";
import {
  PropertyPath as RdfxResourcePropertyPath,
  Resource,
  ResourceSet,
} from "@rdfx/resource";
import { NTriplesIdentifier } from "@rdfx/string";
import { Decimal as BigDecimal } from "decimal.js";
import { Either, Left, Right } from "purify-ts";
import { z } from "zod";

type $_FromRdfResourceFunction<T> = (
  resource: Resource,
  options: {
    context: undefined | unknown;
    graph: Exclude<Quad_Graph, Variable> | undefined;
    ignoreRdfType: boolean;
    objectSet: $ObjectSet;
    preferredLanguages: readonly string[] | undefined;
  },
) => Either<Error, T>;

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

function $arrayFromJsonArray<ItemJsonValueT, ItemT, ItemSchemaT>(
  itemFromJsonValue: $FromJsonFunction<ItemJsonValueT, ItemT, ItemSchemaT>,
): $FromJsonFunction<
  ItemJsonValueT[] | undefined,
  ItemT[],
  $CollectionSchema<ItemSchemaT>
> {
  return (jsonArray, options) => {
    if (jsonArray === undefined) {
      return Either.of([]);
    }
    const { schema, ...otherOptions } = options;
    const itemFromJsonValueOptions = {
      schema: schema.itemType,
      ...otherOptions,
    };
    return Either.sequence(
      jsonArray.map((itemJsonValue) =>
        itemFromJsonValue(itemJsonValue, itemFromJsonValueOptions),
      ),
    );
  };
}

const $bigDecimalFromJsonString: $FromJsonFunction<
  string,
  BigDecimal,
  $NumericSchema<BigDecimal>
> = (jsonValue) => Either.encase(() => new BigDecimal(jsonValue));

const $bigDecimalFromRdfResourceValues: $FromRdfResourceValuesFunction<
  BigDecimal,
  $NumericSchema<BigDecimal>
> = (values, options) =>
  $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) => value.toBigDecimal(options.schema.in)),
  );

/**
 * Create a Literal from a BigDecimal.
 */
function $bigDecimalLiteral(value: BigDecimal): Literal {
  return dataFactory.literal(value.toFixed(), $xsd_decimal);
}

function $bigIntFromJsonString<
  JsonValueT extends string,
  BigIntT extends bigint,
>(
  jsonValue: JsonValueT,
  options: Parameters<
    $FromJsonFunction<string, BigIntT, $NumericSchema<BigIntT>>
  >[1],
): Either<Error, BigIntT> {
  const { schema } = options;
  return Either.encase(() => BigInt(jsonValue) as BigIntT).chain((value) =>
    $constrainPrimitive<BigIntT, bigint>(value, schema.in),
  ) as Either<Error, BigIntT>;
}

function $bigIntFromRdfResourceValues<BigIntT extends bigint>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<BigIntT, $NumericSchema<BigIntT>>
  >[1],
): Either<Error, Resource.Values<BigIntT>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toBigInt(options.schema.in)
        : (value.toBigInt() as Either<Error, BigIntT>),
    ),
  );
}

const $blankNodeFromJsonString: $FromJsonFunction<
  string,
  BlankNode,
  undefined
> = (jsonValue) => Right(dataFactory.blankNode(jsonValue.substring(2)));

interface $BooleanFilter {
  readonly value?: boolean;
}

function $booleanFromJsonBoolean<BooleanT extends boolean>(
  jsonBoolean: BooleanT,
  _options: Parameters<
    $FromJsonFunction<BooleanT, BooleanT, $BooleanSchema<BooleanT>>
  >[1],
): Either<Error, BooleanT> {
  return Either.of(jsonBoolean);
}

function $booleanFromRdfResourceValues<BooleanT extends boolean>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<BooleanT, $BooleanSchema<BooleanT>>
  >[1],
): Either<Error, Resource.Values<BooleanT>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toBoolean(options.schema.in)
        : (value.toBoolean() as Either<Error, BooleanT>),
    ),
  );
}

interface $BooleanSchema<BooleanT extends boolean> {
  readonly datatype: NamedNode;
  readonly hasValues?: readonly Literal[];
  readonly in?: readonly BooleanT[];
  readonly kind: "Boolean";
}

type $CollectionFilter<ItemFilterT> = ItemFilterT & {
  readonly $maxCount?: number;
  readonly $minCount?: number;
};

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

function $constrainPrimitive<
  ConstrainedT extends UnconstrainedT,
  UnconstrainedT extends $Primitive,
>(
  value: UnconstrainedT,
  in_?: readonly ConstrainedT[],
): Either<Error, ConstrainedT | UnconstrainedT> {
  if (in_ && !in_.some((check) => value === check)) {
    return Left(
      new Error(
        `primitive ${value} does not match expected ${in_.map((_) => _.toString()).join(" | ")}`,
      ),
    );
  }
  return Either.of<Error, UnconstrainedT>(value as ConstrainedT);
}

type $ConversionFunction<
  SourceT,
  TargetT,
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
> = (
  source: SourceT,
  defaultNamespace?: DefaultNamespaceT,
) => Either<Error, TargetT>;

const $convertToBigDecimal: $ConversionFunction<
  number | string | BigDecimal,
  BigDecimal
> = (value) => Either.encase(() => new BigDecimal(value));

const $convertToBigInt: $ConversionFunction<
  bigint | number | string,
  bigint
> = (value) => Either.encase(() => BigInt(value));

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
  DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
>(
  value: NamedNode | (keyof DefaultNamespaceT & string),
  defaultNamespace?: DefaultNamespaceT,
): Either<Error, NamedNode> {
  switch (typeof value) {
    case "object":
      return Either.of(value);
    case "string":
      return expandIri(value, { dataFactory: dataFactory, defaultNamespace });
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
      return expandIri(identifier, {
        dataFactory: dataFactory,
        defaultNamespace,
      }).map((iri) => () => iri);
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

function $filterArray<ItemT, ItemFilterT>(
  filterItem: (itemFilter: ItemFilterT, item: ItemT) => boolean,
) {
  return (
    filter: $CollectionFilter<ItemFilterT>,
    values: readonly ItemT[],
  ): boolean => {
    for (const value of values) {
      if (!filterItem(filter, value)) {
        return false;
      }
    }

    if (filter.$maxCount !== undefined && values.length > filter.$maxCount) {
      return false;
    }

    if (filter.$minCount !== undefined && values.length < filter.$minCount) {
      return false;
    }

    return true;
  };
}

const $filterBigDecimal: $FilterFunction<
  $NumericFilter<BigDecimal>,
  BigDecimal
> = (filter, value) => {
  if (
    filter.in !== undefined &&
    !filter.in.some((inValue) => inValue.equals(value))
  ) {
    return false;
  }

  if (
    filter.maxExclusive !== undefined &&
    value.greaterThanOrEqualTo(filter.maxExclusive)
  ) {
    return false;
  }

  if (
    filter.maxInclusive !== undefined &&
    value.greaterThan(filter.maxInclusive)
  ) {
    return false;
  }

  if (
    filter.minExclusive !== undefined &&
    value.lessThanOrEqualTo(filter.minExclusive)
  ) {
    return false;
  }

  if (
    filter.minInclusive !== undefined &&
    value.lessThan(filter.minInclusive)
  ) {
    return false;
  }

  return true;
};

const $filterBoolean: $FilterFunction<$BooleanFilter, boolean> = (
  filter,
  value,
) => {
  if (filter.value !== undefined && value !== filter.value) {
    return false;
  }

  return true;
};

export type $FilterFunction<FilterT, ValueT> = (
  filter: FilterT,
  value: ValueT,
) => boolean;

const $filterIdentifier: $FilterFunction<
  $IdentifierFilter,
  BlankNode | NamedNode
> = (filter, value) => {
  if (
    filter.in !== undefined &&
    !filter.in.some((inValue) => inValue.equals(value))
  ) {
    return false;
  }

  if (filter.type !== undefined && value.termType !== filter.type) {
    return false;
  }

  return true;
};

const $filterIri: $FilterFunction<$IriFilter, NamedNode> = (filter, value) => {
  if (
    filter.in !== undefined &&
    !filter.in.some((inValue) => inValue.equals(value))
  ) {
    return false;
  }

  return true;
};

const $filterLiteral: $FilterFunction<$LiteralFilter, Literal> = $filterTerm;

function $filterNumeric<NumericT extends bigint | number>(
  filter: $NumericFilter<NumericT>,
  value: NumericT,
) {
  if (
    filter.in !== undefined &&
    !filter.in.some((inValue) => inValue === value)
  ) {
    return false;
  }

  if (filter.maxExclusive !== undefined && value >= filter.maxExclusive) {
    return false;
  }

  if (filter.maxInclusive !== undefined && value > filter.maxInclusive) {
    return false;
  }

  if (filter.minExclusive !== undefined && value <= filter.minExclusive) {
    return false;
  }

  if (filter.minInclusive !== undefined && value < filter.minInclusive) {
    return false;
  }

  return true;
}

const $filterString: $FilterFunction<$StringFilter, string> = (
  filter,
  value,
) => {
  if (
    filter.in !== undefined &&
    !filter.in.some((inValue) => inValue === value)
  ) {
    return false;
  }

  if (filter.maxLength !== undefined && value.length > filter.maxLength) {
    return false;
  }

  if (filter.minLength !== undefined && value.length < filter.minLength) {
    return false;
  }

  return true;
};

function $filterTerm<TermT extends BlankNode | Literal | NamedNode>(
  filter: $TermFilter<TermT>,
  value: BlankNode | Literal | NamedNode,
): boolean {
  if (
    filter.datatypeIn !== undefined &&
    (value.termType !== "Literal" ||
      !filter.datatypeIn.some((inDatatype) =>
        inDatatype.equals(value.datatype),
      ))
  ) {
    return false;
  }

  if (
    filter.in !== undefined &&
    !filter.in.some((inTerm) => inTerm.equals(value))
  ) {
    return false;
  }

  if (
    filter.languageIn !== undefined &&
    (value.termType !== "Literal" ||
      !filter.languageIn.some((inLanguage) => inLanguage === value.language))
  ) {
    return false;
  }

  if (
    filter.typeIn !== undefined &&
    !filter.typeIn.some((inType) => inType === value.termType)
  ) {
    return false;
  }

  return true;
}

function $floatFromJsonNumber<FloatT extends number>(
  jsonNumber: FloatT,
  _options: Parameters<
    $FromJsonFunction<FloatT, FloatT, $NumericSchema<FloatT>>
  >[1],
): Either<Error, FloatT> {
  return Either.of(jsonNumber);
}

function $floatFromRdfResourceValues<FloatT extends number>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<FloatT, $NumericSchema<FloatT>>
  >[1],
): Either<Error, Resource.Values<FloatT>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toFloat(options.schema.in)
        : (value.toFloat() as Either<Error, FloatT>),
    ),
  );
}

export type $FromJsonFunction<JsonValueT, ValueT, ValueSchemaT> = [
  ValueSchemaT,
] extends [undefined]
  ? (
      jsonValue: JsonValueT,
      options?: {
        context?: unknown;
        defaultNamespace?: $NamespaceBuilder;
        objectSet?: $ObjectSet;
        prefixMap?: PrefixMap;
        schema?: unknown;
      },
    ) => Either<Error, ValueT>
  : (
      jsonValue: JsonValueT,
      options: {
        context?: unknown;
        defaultNamespace?: $NamespaceBuilder;
        objectSet?: $ObjectSet;
        prefixMap?: PrefixMap;
        schema: ValueSchemaT;
      },
    ) => Either<Error, ValueT>;

export type $FromRdfResourceFunction<T> = (
  resource: Resource,
  options?: {
    context?: unknown;
    graph?: Exclude<Quad_Graph, Variable>;
    ignoreRdfType?: boolean;
    objectSet?: $ObjectSet;
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
    objectSet: $ObjectSet;
    preferredLanguages?: readonly string[];
    propertyPath: $PropertyPath;
    schema: ValueSchemaT;
  },
) => Either<Error, Resource.Values<ValueT>>;

interface $IdentifierFilter {
  readonly in?: readonly (BlankNode | NamedNode)[];
  readonly type?: "BlankNode" | "NamedNode";
}

const $identifierFromJsonString: $FromJsonFunction<
  string,
  BlankNode | NamedNode,
  $IdentifierSchema
> = (jsonString, options) =>
  jsonString.startsWith("_:")
    ? ($blankNodeFromJsonString(jsonString, options) as Either<
        Error,
        BlankNode | NamedNode
      >)
    : ($iriFromJsonString(jsonString, options) as Either<
        Error,
        BlankNode | NamedNode
      >);

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

class $IdentifierSet {
  private readonly blankNodeValues = new Set<string>();
  private readonly namedNodeValues = new Set<string>();

  add(identifier: BlankNode | NamedNode): this {
    switch (identifier.termType) {
      case "BlankNode":
        this.blankNodeValues.add(identifier.value);
        return this;
      case "NamedNode":
        this.namedNodeValues.add(identifier.value);
        return this;
    }
  }

  has(identifier: BlankNode | NamedNode): boolean {
    switch (identifier.termType) {
      case "BlankNode":
        return this.blankNodeValues.has(identifier.value);
      case "NamedNode":
        return this.namedNodeValues.has(identifier.value);
    }
  }
}

function $identityValidationFunction<T>(
  _schema: unknown,
  value: T,
): Either<Error, T> {
  return Either.of(value);
}

function $intFromJsonNumber<IntT extends number>(
  jsonNumber: IntT,
  _options: Parameters<$FromJsonFunction<IntT, IntT, $NumericSchema<IntT>>>[1],
): Either<Error, IntT> {
  return Either.of(jsonNumber);
}

function $intFromRdfResourceValues<IntT extends number>(
  values: Resource.Values,
  options: Parameters<
    $FromRdfResourceValuesFunction<IntT, $NumericSchema<IntT>>
  >[1],
): Either<Error, Resource.Values<IntT>> {
  return $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) =>
      options.schema.in
        ? value.toInt(options.schema.in)
        : (value.toInt() as Either<Error, IntT>),
    ),
  );
}

interface $IriFilter {
  readonly in?: readonly NamedNode[];
}

function $iriFromJsonString(
  jsonString: string,
  options: Parameters<$FromJsonFunction<string, NamedNode, object>>[1],
): Either<Error, NamedNode> {
  return expandIri(jsonString, { ...options, dataFactory: dataFactory });
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

const $langStringFromJsonObject: $FromJsonFunction<
  $LangStringJsonObject,
  Literal,
  $LangStringSchema
> = (jsonObject) =>
  Either.of<Error, Literal>(
    dataFactory.literal(jsonObject["@value"], jsonObject["@language"]),
  );

const $langStringFromRdfResourceValues: $FromRdfResourceValuesFunction<
  Literal,
  $LangStringSchema
> = (values, options) =>
  $termLikeFromRdfResourceValues(values, options).chain((values) =>
    values.chainMap((value) => value.toLangString(options.schema.in)),
  );

interface $LangStringJsonObject {
  "@language": string;
  "@value": string;
}

namespace $LangStringJsonObject {
  export const schema = () =>
    z.object({ "@language": z.string().min(1), "@value": z.string().min(1) });
}

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

interface $LazySchema<PartialSchemaT> {
  readonly kind: "Lazy" | "LazyOption" | "LazySet";
  readonly partialType: PartialSchemaT;
}

const $literalFactory = new LiteralFactory({ dataFactory: dataFactory });

type $LiteralFilter = Omit<$TermFilter<Literal>, "typeIn">;

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

interface $NumericFilter<T> {
  readonly in?: readonly T[];
  readonly maxExclusive?: T;
  readonly maxInclusive?: T;
  readonly minExclusive?: T;
  readonly minInclusive?: T;
}

interface $NumericSchema<T> {
  readonly datatype: NamedNode;
  readonly hasValues?: readonly Literal[];
  readonly in?: readonly T[];
  readonly kind: "BigDecimal" | "BigInt" | "Float" | "Int";
}

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

type $Primitive = bigint | boolean | number | string;

export type $PropertyPath = RdfxResourcePropertyPath;

export namespace $PropertyPath {
  export type Filter = object;

  export function filter(_filter: Filter, _value: $PropertyPath): boolean {
    return true;
  }

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

const $rdf_langString = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
);

const $rdf_subject = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
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

interface $StringFilter {
  readonly in?: readonly string[];
  readonly maxLength?: number;
  readonly minLength?: number;
}

function $stringFromJsonString<StringT extends string>(
  jsonString: StringT,
  _options: Parameters<
    $FromJsonFunction<StringT, StringT, $StringSchema<StringT>>
  >[1],
): Either<Error, StringT> {
  return Either.of(jsonString);
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

interface $TermFilter<TermT extends BlankNode | Literal | NamedNode> {
  readonly datatypeIn?: readonly NamedNode[];
  readonly in?: readonly Exclude<TermT, BlankNode>[];
  readonly languageIn?: readonly string[];
  readonly typeIn?: readonly TermT["termType"][];
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
      objectSet,
      preferredLanguages,
    } = options ?? {};
    return _fromRdfResourceFunction(resource, {
      context,
      graph,
      ignoreRdfType,
      objectSet: objectSet ?? new $RdfjsDatasetObjectSet(resource.dataset),
      preferredLanguages,
    });
  };
}

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

const $xsd_decimal = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#decimal",
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

  export const _toRdfResource: $_ToRdfResourceFunction<
    $DefaultPartial.Identifier,
    $DefaultPartial
  > = (parameters) => {
    return parameters.resource;
  };

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

  export const filter: $FilterFunction<
    $DefaultPartial.Filter,
    $DefaultPartial
  > = (filter, value) => {
    if (
      filter.$identifier !== undefined &&
      !$filterIdentifier(filter.$identifier, value.$identifier())
    ) {
      return false;
    }
    return true;
  };

  export type Filter = { readonly $identifier?: $IdentifierFilter };

  export const fromJson: $FromJsonFunction<
    $DefaultPartial.Json,
    $DefaultPartial.Discriminated,
    undefined
  > = (jsonObject, options = {}) =>
    $sequenceRecord({
      $identifier: $identifierFromJsonString(jsonObject["@id"], {
        ...options,
        schema: $DefaultPartial.schema.properties.$identifier.type,
      }),
    }).chain($DefaultPartial.create);

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

  export type Json = { "@id": string };

  export namespace Json {
    export function parse(json: unknown): Either<Error, Json> {
      const jsonSafeParseResult = schema().safeParse(json);
      if (!jsonSafeParseResult.success) {
        return Left(jsonSafeParseResult.error);
      }
      return Right(jsonSafeParseResult.data);
    }

    export function schema() {
      return z.union([
        z.object({ "@id": z.string().min(1) }),
        z
          .string()
          .min(1)
          .transform((id) => ({ "@id": id })),
      ]) satisfies z.ZodType<Json, Json | string>;
    }
  }

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    $DefaultPartial.Identifier,
    $DefaultPartial
  > = $wrap_ToRdfResourceFunction<$DefaultPartial.Identifier, $DefaultPartial>(
    $DefaultPartial._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    $DefaultPartial,
    BlankNode | NamedNode
  > = (value, options) => [
    $DefaultPartial.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<$DefaultPartial> = (
    _defaultPartial,
  ) =>
    $compactRecord({ $identifier: _defaultPartial.$identifier().toString() });
}

export type NodeShape1 = {
  readonly $identifier: () => NodeShape1.Identifier;

  readonly booleanProperty: boolean;

  readonly decimalProperty: BigDecimal;

  readonly doubleProperty: number;

  readonly integerProperty: bigint;

  readonly intProperty: number;

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
      booleanProperty: $shaclPropertyFromRdf<boolean, $BooleanSchema<boolean>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.booleanProperty,
        typeFromRdfResourceValues: $booleanFromRdfResourceValues<boolean>,
      }),
      decimalProperty: $shaclPropertyFromRdf<
        BigDecimal,
        $NumericSchema<BigDecimal>
      >({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.decimalProperty,
        typeFromRdfResourceValues: $bigDecimalFromRdfResourceValues,
      }),
      doubleProperty: $shaclPropertyFromRdf<number, $NumericSchema<number>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.doubleProperty,
        typeFromRdfResourceValues: $floatFromRdfResourceValues<number>,
      }),
      integerProperty: $shaclPropertyFromRdf<bigint, $NumericSchema<bigint>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.integerProperty,
        typeFromRdfResourceValues: $bigIntFromRdfResourceValues<bigint>,
      }),
      intProperty: $shaclPropertyFromRdf<number, $NumericSchema<number>>({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape1.schema.properties.intProperty,
        typeFromRdfResourceValues: $intFromRdfResourceValues<number>,
      }),
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
        $LazySchema<$DefaultPartial.Schema>
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
                    resolver: (partial, resolverOptions) => {
                      const objectSet = fromRdfResourceValuesOptions?.objectSet;
                      if (!objectSet) {
                        return $missingResolver();
                      }
                      return objectSet.nodeShape2(
                        partial.$identifier(),
                        resolverOptions,
                      );
                    },
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

  export const _toRdfResource: $_ToRdfResourceFunction<
    NodeShape1.Identifier,
    NodeShape1
  > = (parameters) => {
    parameters.resource.add(
      NodeShape1.schema.properties.booleanProperty.path,
      [
        $literalFactory.boolean(
          parameters.object.booleanProperty,
          $xsd_boolean,
        ),
      ],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.decimalProperty.path,
      [$bigDecimalLiteral(parameters.object.decimalProperty)],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.doubleProperty.path,
      [$literalFactory.number(parameters.object.doubleProperty, $xsd_double)],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.integerProperty.path,
      [$literalFactory.bigint(parameters.object.integerProperty, $xsd_integer)],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.intProperty.path,
      [$literalFactory.number(parameters.object.intProperty, $xsd_int)],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.iriProperty.path,
      [parameters.object.iriProperty],
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.langStringProperty.path,
      parameters.object.langStringProperty.flatMap((item) => [item]),
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.nodeProperty.path,
      $DefaultPartial.toRdfResourceValues(
        parameters.object.nodeProperty.partial,
        {
          ignoreRdfType: parameters.ignoreRdfType,
          graph: parameters.graph,
          resource: parameters.resource,
          resourceSet: parameters.resourceSet,
          propertyPath: NodeShape1.schema.properties.nodeProperty.path,
        },
      ),
      parameters.graph,
    );
    parameters.resource.add(
      NodeShape1.schema.properties.stringProperty.path,
      [$literalFactory.string(parameters.object.stringProperty)],
      parameters.graph,
    );
    return parameters.resource;
  };

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
      booleanProperty: Either.of(parameters.booleanProperty),
      decimalProperty: $convertToBigDecimal(
        parameters.decimalProperty,
        parameters.$defaultNamespace,
      ),
      doubleProperty: Either.of(parameters.doubleProperty),
      integerProperty: $convertToBigInt(
        parameters.integerProperty,
        parameters.$defaultNamespace,
      ),
      intProperty: Either.of(parameters.intProperty),
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
    readonly booleanProperty: boolean;
    readonly decimalProperty: BigDecimal | number | string;
    readonly doubleProperty: number;
    readonly integerProperty: bigint | number | string;
    readonly intProperty: number;
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

  export const filter: $FilterFunction<NodeShape1.Filter, NodeShape1> = (
    filter,
    value,
  ) => {
    if (
      filter.$identifier !== undefined &&
      !$filterIri(filter.$identifier, value.$identifier())
    ) {
      return false;
    }
    if (
      filter.booleanProperty !== undefined &&
      !$filterBoolean(filter.booleanProperty, value.booleanProperty)
    ) {
      return false;
    }
    if (
      filter.decimalProperty !== undefined &&
      !$filterBigDecimal(filter.decimalProperty, value.decimalProperty)
    ) {
      return false;
    }
    if (
      filter.doubleProperty !== undefined &&
      !$filterNumeric<number>(filter.doubleProperty, value.doubleProperty)
    ) {
      return false;
    }
    if (
      filter.integerProperty !== undefined &&
      !$filterNumeric<bigint>(filter.integerProperty, value.integerProperty)
    ) {
      return false;
    }
    if (
      filter.intProperty !== undefined &&
      !$filterNumeric<number>(filter.intProperty, value.intProperty)
    ) {
      return false;
    }
    if (
      filter.iriProperty !== undefined &&
      !$filterIri(filter.iriProperty, value.iriProperty)
    ) {
      return false;
    }
    if (
      filter.langStringProperty !== undefined &&
      !$filterArray<Literal, $LiteralFilter>($filterLiteral)(
        filter.langStringProperty,
        value.langStringProperty,
      )
    ) {
      return false;
    }
    if (
      filter.nodeProperty !== undefined &&
      !((filter, value) => $DefaultPartial.filter(filter, value.partial))(
        filter.nodeProperty,
        value.nodeProperty,
      )
    ) {
      return false;
    }
    if (
      filter.stringProperty !== undefined &&
      !$filterString(filter.stringProperty, value.stringProperty)
    ) {
      return false;
    }
    return true;
  };

  export type Filter = {
    readonly $identifier?: $IriFilter;
    readonly booleanProperty?: $BooleanFilter;
    readonly decimalProperty?: $NumericFilter<BigDecimal>;
    readonly doubleProperty?: $NumericFilter<number>;
    readonly integerProperty?: $NumericFilter<bigint>;
    readonly intProperty?: $NumericFilter<number>;
    readonly iriProperty?: $IriFilter;
    readonly langStringProperty?: $CollectionFilter<$LiteralFilter>;
    readonly nodeProperty?: $DefaultPartial.Filter;
    readonly stringProperty?: $StringFilter;
  };

  export const fromJson: $FromJsonFunction<
    NodeShape1.Json,
    NodeShape1.Discriminated,
    undefined
  > = (jsonObject, options = {}) =>
    $sequenceRecord({
      $identifier: $iriFromJsonString(jsonObject["@id"], {
        ...options,
        schema: NodeShape1.schema.properties.$identifier.type,
      }),
      booleanProperty: $booleanFromJsonBoolean<boolean>(
        jsonObject["booleanProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.booleanProperty.type,
        },
      ),
      decimalProperty: $bigDecimalFromJsonString(
        jsonObject["decimalProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.decimalProperty.type,
        },
      ),
      doubleProperty: $floatFromJsonNumber<number>(
        jsonObject["doubleProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.doubleProperty.type,
        },
      ),
      integerProperty: $bigIntFromJsonString<string, bigint>(
        jsonObject["integerProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.integerProperty.type,
        },
      ),
      intProperty: $intFromJsonNumber<number>(jsonObject["intProperty"], {
        ...options,
        schema: NodeShape1.schema.properties.intProperty.type,
      }),
      iriProperty: $iriFromJsonString(jsonObject["iriProperty"], {
        ...options,
        schema: NodeShape1.schema.properties.iriProperty.type,
      }),
      langStringProperty: $arrayFromJsonArray($langStringFromJsonObject)(
        jsonObject["langStringProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.langStringProperty.type,
        },
      ),
      nodeProperty: ((jsonValue, fromJsonValueOptions) =>
        $DefaultPartial
          .fromJson(jsonValue, {
            ...fromJsonValueOptions,
            schema: fromJsonValueOptions.schema.partialType,
          })
          .map(
            (partial) =>
              new $Lazy<$DefaultPartial, NodeShape2>({
                partial,
                resolver: (partial, resolverOptions) => {
                  const objectSet = fromJsonValueOptions?.objectSet;
                  if (!objectSet) {
                    return $missingResolver();
                  }
                  return objectSet.nodeShape2(
                    partial.$identifier(),
                    resolverOptions,
                  );
                },
              }),
          ))(jsonObject["nodeProperty"], {
        ...options,
        schema: NodeShape1.schema.properties.nodeProperty.type,
      }),
      stringProperty: $stringFromJsonString<string>(
        jsonObject["stringProperty"],
        {
          ...options,
          schema: NodeShape1.schema.properties.stringProperty.type,
        },
      ),
    }).chain(NodeShape1.create);

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

  export type Json = {
    "@id": string;
    booleanProperty: boolean;
    decimalProperty: string;
    doubleProperty: number;
    integerProperty: string;
    intProperty: number;
    iriProperty: string;
    langStringProperty: $LangStringJsonObject[];
    nodeProperty: $DefaultPartial.Json;
    stringProperty: string;
  };

  export namespace Json {
    export function parse(json: unknown): Either<Error, Json> {
      const jsonSafeParseResult = schema().safeParse(json);
      if (!jsonSafeParseResult.success) {
        return Left(jsonSafeParseResult.error);
      }
      return Right(jsonSafeParseResult.data);
    }

    export function schema() {
      return z.object({
        "@id": z.string().min(1),
        booleanProperty: z.boolean(),
        decimalProperty: z.string(),
        doubleProperty: z.number(),
        integerProperty: z.string(),
        intProperty: z.number(),
        iriProperty: z.string().min(1),
        langStringProperty: z.array($LangStringJsonObject.schema()).min(1),
        nodeProperty: $DefaultPartial.Json.schema(),
        stringProperty: z.string(),
      }) satisfies z.ZodType<Json>;
    }
  }

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Iri" } as const,
      } as const,
      booleanProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/booleanProperty"),
        type: { datatype: $xsd_boolean, kind: "Boolean" } as const,
      } as const,
      decimalProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/decimalProperty"),
        type: { datatype: $xsd_decimal, kind: "BigDecimal" } as const,
      } as const,
      doubleProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/doubleProperty"),
        type: { datatype: $xsd_double, kind: "Float" } as const,
      } as const,
      integerProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/integerProperty"),
        type: { datatype: $xsd_integer, kind: "BigInt" } as const,
      } as const,
      intProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/intProperty"),
        type: { datatype: $xsd_int, kind: "Int" } as const,
      } as const,
      iriProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/iriProperty"),
        type: { kind: "Iri" } as const,
      } as const,
      langStringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/langStringProperty"),
        type: {
          itemType: { kind: "LangString" } as const,
          kind: "Set",
          minCount: 1,
        } as const,
      } as const,
      nodeProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/nodeProperty"),
        get type() {
          return {
            kind: "Lazy",
            get partialType() {
              return $DefaultPartial.schema;
            },
          } as const;
        },
      } as const,
      stringProperty: {
        kind: "Shacl",
        path: dataFactory.namedNode("http://example.com/stringProperty"),
        type: { datatype: $xsd_string, kind: "String" } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    NodeShape1.Identifier,
    NodeShape1
  > = $wrap_ToRdfResourceFunction<NodeShape1.Identifier, NodeShape1>(
    NodeShape1._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    NodeShape1,
    NamedNode
  > = (value, options) => [
    NodeShape1.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

  export const toStringRecord: $ToStringRecordFunction<
    Pick<NodeShape1, "$identifier">
  > = (_nodeShape1) =>
    $compactRecord({ $identifier: _nodeShape1.$identifier().toString() });
}

export type NodeShape2 = {
  readonly $identifier: () => NodeShape2.Identifier;
  readonly label: readonly Literal[];
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
      label: $shaclPropertyFromRdf<
        readonly Literal[],
        $CollectionSchema<$LangStringSchema>
      >({
        ...options,
        focusResource: resource,
        ignoreRdfType: true,
        propertySchema: NodeShape2.schema.properties.label,
        typeFromRdfResourceValues: $setFromRdfResourceValues<
          Literal,
          $LangStringSchema
        >($langStringFromRdfResourceValues),
      }),
    }).chain((properties) => NodeShape2.create(properties));

  export const _toRdfResource: $_ToRdfResourceFunction<
    NodeShape2.Identifier,
    NodeShape2
  > = (parameters) => {
    parameters.resource.add(
      NodeShape2.schema.properties.label.path,
      parameters.object.label.flatMap((item) => [item]),
      parameters.graph,
    );
    return parameters.resource;
  };

  export const $toString: $ToStringFunction<Pick<NodeShape2, "$identifier">> = (
    _nodeShape2,
  ) => `NodeShape2(${JSON.stringify(NodeShape2.toStringRecord(_nodeShape2))})`;

  export const create: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters: NodeShape2.CreateParameters<$DefaultNamespaceT>,
  ) => Either<Error, NodeShape2.Discriminated> = (parameters) =>
    $sequenceRecord({
      $identifier: $convertToIdentifierProperty(
        parameters.$identifier,
        parameters.$defaultNamespace,
      ),
      $type: Right("NodeShape2" as const),
      label: $convertToScalarSet($convertToLangString)(
        parameters.label,
        parameters.$defaultNamespace,
      ).chain((value) =>
        $validateArray($identityValidationFunction)(
          NodeShape2.schema.properties.label.type,
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
    readonly label: Literal | readonly Literal[];
  };

  export const createUnsafe: <
    $DefaultNamespaceT extends $NamespaceBuilder = $NamespaceBuilder,
  >(
    parameters: NodeShape2.CreateParameters<$DefaultNamespaceT>,
  ) => NodeShape2.Discriminated = (parameters) =>
    create(parameters).unsafeCoerce();

  export type Discriminated = NodeShape2 & { readonly $type: "NodeShape2" };

  export const filter: $FilterFunction<NodeShape2.Filter, NodeShape2> = (
    filter,
    value,
  ) => {
    if (
      filter.$identifier !== undefined &&
      !$filterIdentifier(filter.$identifier, value.$identifier())
    ) {
      return false;
    }
    if (
      filter.label !== undefined &&
      !$filterArray<Literal, $LiteralFilter>($filterLiteral)(
        filter.label,
        value.label,
      )
    ) {
      return false;
    }
    return true;
  };

  export type Filter = {
    readonly $identifier?: $IdentifierFilter;
    readonly label?: $CollectionFilter<$LiteralFilter>;
  };

  export const fromJson: $FromJsonFunction<
    NodeShape2.Json,
    NodeShape2.Discriminated,
    undefined
  > = (jsonObject, options = {}) =>
    $sequenceRecord({
      $identifier: $identifierFromJsonString(jsonObject["@id"], {
        ...options,
        schema: NodeShape2.schema.properties.$identifier.type,
      }),
      label: $arrayFromJsonArray($langStringFromJsonObject)(
        jsonObject["label"],
        {
          ...options,
          schema: NodeShape2.schema.properties.label.type,
        },
      ),
    }).chain(NodeShape2.create);

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

  export type Json = { "@id": string; label: $LangStringJsonObject[] };

  export namespace Json {
    export function parse(json: unknown): Either<Error, Json> {
      const jsonSafeParseResult = schema().safeParse(json);
      if (!jsonSafeParseResult.success) {
        return Left(jsonSafeParseResult.error);
      }
      return Right(jsonSafeParseResult.data);
    }

    export function schema() {
      return z.object({
        "@id": z.string().min(1),
        label: z.array($LangStringJsonObject.schema()).min(1),
      }) satisfies z.ZodType<Json>;
    }
  }

  export const schema = {
    kind: "Object",
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" } as const,
      } as const,
      label: {
        kind: "Shacl",
        path: $rdfs_label,
        type: {
          itemType: { kind: "LangString" } as const,
          kind: "Set",
          minCount: 1,
        } as const,
      } as const,
    },
  } as const;

  export type Schema = typeof schema;

  export const toRdfResource: $ToRdfResourceFunction<
    NodeShape2.Identifier,
    NodeShape2
  > = $wrap_ToRdfResourceFunction<NodeShape2.Identifier, NodeShape2>(
    NodeShape2._toRdfResource,
  );

  export const toRdfResourceValues: $ToRdfResourceValuesFunction<
    NodeShape2,
    BlankNode | NamedNode
  > = (value, options) => [
    NodeShape2.toRdfResource(value, {
      graph: options.graph,
      resourceSet: options.resourceSet,
    }).identifier,
  ];

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
  export const toRdfResource: $ToRdfResourceFunction<
    Resource.Identifier,
    $Object
  > = (object, options) => {
    switch (object.$type) {
      case "DefaultPartial":
        return $DefaultPartial.toRdfResource(object, options);
      case "NodeShape1":
        return NodeShape1.toRdfResource(object, options);
      case "NodeShape2":
        return NodeShape2.toRdfResource(object, options);
      default:
        object satisfies never;
        throw new Error("should never reach this point");
    }
  };

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

export interface $ObjectSet {
  nodeShape1(
    identifier: NodeShape1.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Promise<Either<Error, NodeShape1>>;

  nodeShape1Count(
    query?: Pick<
      $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
      "filter"
    >,
  ): Promise<Either<Error, number>>;

  nodeShape1Identifiers(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Promise<Either<Error, readonly NodeShape1.Identifier[]>>;

  nodeShape1s(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Promise<Either<Error, readonly NodeShape1[]>>;

  nodeShape2(
    identifier: NodeShape2.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Promise<Either<Error, NodeShape2>>;

  nodeShape2Count(
    query?: Pick<
      $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
      "filter"
    >,
  ): Promise<Either<Error, number>>;

  nodeShape2Identifiers(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Promise<Either<Error, readonly NodeShape2.Identifier[]>>;

  nodeShape2s(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Promise<Either<Error, readonly NodeShape2[]>>;
}

export namespace $ObjectSet {
  export interface Query<
    ObjectFilterT,
    ObjectIdentifierT extends BlankNode | NamedNode,
  > {
    readonly filter?: ObjectFilterT;
    readonly graph?: Exclude<Quad_Graph, Variable>;
    readonly identifiers?: readonly ObjectIdentifierT[];
    readonly limit?: number;
    readonly offset?: number;
    readonly preferredLanguages?: readonly string[];
  }
}

export class $RdfjsDatasetObjectSet implements $ObjectSet {
  readonly #dataset: DatasetCore | (() => DatasetCore);
  readonly #graph?: Exclude<Quad_Graph, Variable>;

  constructor(
    dataset: DatasetCore | (() => DatasetCore),
    options?: { graph?: Exclude<Quad_Graph, Variable> },
  ) {
    this.#dataset = dataset;
    this.#graph = options?.graph;
  }

  protected $dataset(): DatasetCore {
    if (typeof this.#dataset === "object") {
      return this.#dataset;
    }
    return this.#dataset();
  }

  protected $resourceSet(): ResourceSet {
    return new ResourceSet({
      dataFactory: dataFactory,
      dataset: this.$dataset(),
    });
  }

  async nodeShape1(
    identifier: NodeShape1.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Promise<Either<Error, NodeShape1>> {
    return this.nodeShape1Sync(identifier, options);
  }

  nodeShape1Sync(
    identifier: NodeShape1.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Either<Error, NodeShape1> {
    return this.nodeShape1sSync({
      identifiers: [identifier],
      preferredLanguages: options?.preferredLanguages,
    }).map((objects) => objects[0]);
  }

  async nodeShape1Count(
    query?: Pick<
      $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
      "filter"
    >,
  ): Promise<Either<Error, number>> {
    return this.nodeShape1CountSync(query);
  }

  nodeShape1CountSync(
    query?: Pick<
      $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
      "filter"
    >,
  ): Either<Error, number> {
    return this.nodeShape1sSync(query).map((objects) => objects.length);
  }

  async nodeShape1Identifiers(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Promise<Either<Error, readonly NodeShape1.Identifier[]>> {
    return this.nodeShape1IdentifiersSync(query);
  }

  nodeShape1IdentifiersSync(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Either<Error, readonly NodeShape1.Identifier[]> {
    return this.nodeShape1sSync(query).map((objects) =>
      objects.map((object) => object.$identifier()),
    );
  }

  async nodeShape1s(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Promise<Either<Error, readonly NodeShape1[]>> {
    return this.nodeShape1sSync(query);
  }

  nodeShape1sSync(
    query?: $ObjectSet.Query<NodeShape1.Filter, NodeShape1.Identifier>,
  ): Either<Error, readonly NodeShape1[]> {
    return this.#objectsSync<
      NodeShape1,
      NodeShape1.Filter,
      NodeShape1.Identifier
    >(
      {
        filter: NodeShape1.filter,
        fromRdfResource: NodeShape1.fromRdfResource,
        fromRdfTypes: [],
      },
      query,
    );
  }

  async nodeShape2(
    identifier: NodeShape2.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Promise<Either<Error, NodeShape2>> {
    return this.nodeShape2Sync(identifier, options);
  }

  nodeShape2Sync(
    identifier: NodeShape2.Identifier,
    options?: { preferredLanguages?: readonly string[] },
  ): Either<Error, NodeShape2> {
    return this.nodeShape2sSync({
      identifiers: [identifier],
      preferredLanguages: options?.preferredLanguages,
    }).map((objects) => objects[0]);
  }

  async nodeShape2Count(
    query?: Pick<
      $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
      "filter"
    >,
  ): Promise<Either<Error, number>> {
    return this.nodeShape2CountSync(query);
  }

  nodeShape2CountSync(
    query?: Pick<
      $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
      "filter"
    >,
  ): Either<Error, number> {
    return this.nodeShape2sSync(query).map((objects) => objects.length);
  }

  async nodeShape2Identifiers(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Promise<Either<Error, readonly NodeShape2.Identifier[]>> {
    return this.nodeShape2IdentifiersSync(query);
  }

  nodeShape2IdentifiersSync(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Either<Error, readonly NodeShape2.Identifier[]> {
    return this.nodeShape2sSync(query).map((objects) =>
      objects.map((object) => object.$identifier()),
    );
  }

  async nodeShape2s(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Promise<Either<Error, readonly NodeShape2[]>> {
    return this.nodeShape2sSync(query);
  }

  nodeShape2sSync(
    query?: $ObjectSet.Query<NodeShape2.Filter, NodeShape2.Identifier>,
  ): Either<Error, readonly NodeShape2[]> {
    return this.#objectsSync<
      NodeShape2,
      NodeShape2.Filter,
      NodeShape2.Identifier
    >(
      {
        filter: NodeShape2.filter,
        fromRdfResource: NodeShape2.fromRdfResource,
        fromRdfTypes: [],
      },
      query,
    );
  }

  #objectsSync<
    ObjectT extends { readonly $identifier: () => ObjectIdentifierT },
    ObjectFilterT,
    ObjectIdentifierT extends BlankNode | NamedNode,
  >(
    namedObjectType: {
      filter: (filter: ObjectFilterT, value: ObjectT) => boolean;
      fromRdfResource: $FromRdfResourceFunction<ObjectT>;
      fromRdfTypes: readonly NamedNode[];
    },
    query?: $ObjectSet.Query<ObjectFilterT, ObjectIdentifierT>,
  ): Either<Error, readonly ObjectT[]> {
    const graph = query?.graph ?? this.#graph;

    const limit = query?.limit ?? Number.MAX_SAFE_INTEGER;
    if (limit <= 0) {
      return Right([]);
    }

    let offset = query?.offset ?? 0;
    if (offset < 0) {
      offset = 0;
    }

    const fromRdfResourceOptions: Parameters<
      $FromRdfResourceFunction<ObjectT>
    >[1] = {
      graph,
      objectSet: this,
      preferredLanguages: query?.preferredLanguages,
    };

    let resources: { object?: ObjectT; resource: Resource }[];
    const resourceSet = this.$resourceSet(); // Access once, in case it's instantiated lazily
    let sortResources: boolean;
    if (query?.identifiers) {
      resources = query.identifiers.map((identifier) => ({
        resource: resourceSet.resource(identifier),
      }));
      sortResources = false;
    } else if (namedObjectType.fromRdfTypes.length > 0) {
      const identifierSet = new $IdentifierSet();
      resources = [];
      sortResources = true;
      for (const fromRdfType of namedObjectType.fromRdfTypes) {
        for (const resource of resourceSet.instancesOf(fromRdfType, {
          graph,
        })) {
          if (!identifierSet.has(resource.identifier)) {
            identifierSet.add(resource.identifier);
            resources.push({ resource });
          }
        }
      }
    } else {
      const identifierSet = new $IdentifierSet();
      resources = [];
      sortResources = true;
      for (const quad of resourceSet.dataset) {
        if (graph && !quad.graph.equals(graph)) {
          continue;
        }

        switch (quad.subject.termType) {
          case "BlankNode":
          case "NamedNode":
            break;
          default:
            continue;
        }

        if (identifierSet.has(quad.subject)) {
          continue;
        }
        identifierSet.add(quad.subject);
        const resource = resourceSet.resource(quad.subject);
        // Eagerly eliminate the majority of resources that won't match the object type
        namedObjectType
          .fromRdfResource(resource, fromRdfResourceOptions)
          .ifRight((object) => {
            resources.push({ object, resource });
          });
      }
    }

    if (sortResources) {
      // Sort resources by identifier so limit and offset are deterministic
      resources.sort((left, right) =>
        left.resource.identifier.value.localeCompare(
          right.resource.identifier.value,
        ),
      );
    }

    let objectI = 0;
    const objects: ObjectT[] = [];
    for (let { object, resource } of resources) {
      if (!object) {
        const objectEither = namedObjectType.fromRdfResource(
          resource,
          fromRdfResourceOptions,
        );
        if (objectEither.isLeft()) {
          return objectEither;
        }
        object = objectEither.unsafeCoerce();
      }

      if (query?.filter && !namedObjectType.filter(query.filter, object)) {
        continue;
      }

      if (objectI++ >= offset) {
        objects.push(object);
        if (objects.length === limit) {
          return Right(objects);
        }
      }
    }
    return Right(objects);
  }
}
