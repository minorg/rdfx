import type {
  BlankNode,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { LiteralFactory } from "@rdfx/literal";
import {
  PropertyPath as RdfxResourcePropertyPath,
  type Resource,
  ResourceSet,
} from "@rdfx/resource";
import { NTriplesIdentifier } from "@rdfx/string";
import { Either, Left, Right } from "purify-ts";
import { z } from "zod";

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
  itemFromJsonValue: $FromJsonValueFunction<ItemJsonValueT, ItemT, ItemSchemaT>,
): $FromJsonValueFunction<
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

const $blankNodeFromJsonString: $FromJsonValueFunction<
  string,
  BlankNode,
  undefined
> = (jsonValue) => Right(dataFactory.blankNode(jsonValue.substring(2)));

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

export type $FromJsonObjectFunction<
  JsonObjectT extends object,
  ValueT,
  ValueSchemaT,
> = [ValueSchemaT] extends [undefined]
  ? (
      jsonObject: JsonObjectT,
      options?: { context?: unknown; schema?: unknown },
    ) => Either<Error, ValueT>
  : (
      jsonObject: JsonObjectT,
      options: { context?: unknown; schema: ValueSchemaT },
    ) => Either<Error, ValueT>;

export type $FromJsonValueFunction<JsonValueT, ValueT, ValueSchemaT> = [
  ValueSchemaT,
] extends [undefined]
  ? (
      jsonValue: JsonValueT,
      options?: { context?: unknown; schema?: unknown },
    ) => Either<Error, ValueT>
  : (
      jsonValue: JsonValueT,
      options: { context?: unknown; schema: ValueSchemaT },
    ) => Either<Error, ValueT>;

const $identifierFromJsonString: $FromJsonValueFunction<
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

function $iriFromJsonString<IriT extends string = string>(
  jsonValue: IriT,
  _options: Parameters<
    $FromJsonValueFunction<IriT, NamedNode<IriT>, object>
  >[1],
): Either<Error, NamedNode<IriT>> {
  return Either.of(dataFactory.namedNode(jsonValue));
}

const $langStringFromJsonObject: $FromJsonObjectFunction<
  $LangStringJsonObject,
  Literal,
  $LangStringSchema
> = (jsonObject) =>
  Either.of<Error, Literal>(
    dataFactory.literal(jsonObject["@value"], jsonObject["@language"]),
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

const $literalFactory = new LiteralFactory({ dataFactory: dataFactory });

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

const $rdf_type = dataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
);

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

function $stringFromJsonString<StringT extends string>(
  jsonString: StringT,
  _options: Parameters<
    $FromJsonValueFunction<StringT, StringT, $StringSchema<StringT>>
  >[1],
): Either<Error, StringT> {
  return Either.of(jsonString);
}

interface $StringSchema<StringT extends string> {
  readonly datatype: NamedNode;
  readonly hasValues?: readonly Literal[];
  readonly in?: readonly StringT[];
  readonly languageIn?: readonly string[];
  readonly kind: "String";
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

const $xsd_string = dataFactory.namedNode(
  "http://www.w3.org/2001/XMLSchema#string",
);

export type $DefaultPartial = {
  readonly $identifier: () => $DefaultPartial.Identifier;
};

export namespace $DefaultPartial {
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

  export const fromJson: $FromJsonObjectFunction<
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

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
  }

  export const is$DefaultPartial: $ObjectTypeGuardFunction<
    $DefaultPartial.Discriminated
  > = (object): object is $DefaultPartial.Discriminated =>
    object.$type === "DefaultPartial";

  export type Json = { "@id": string };

  export const schema = {
    properties: {
      $identifier: {
        kind: "Identifier",
        type: { kind: "Identifier" as const },
      },
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

  readonly iriProperty: NamedNode;

  readonly langStringProperty: readonly Literal[];

  readonly nodeProperty: $Lazy<$DefaultPartial, NodeShape2>;

  readonly stringProperty: string;
};

export namespace NodeShape1 {
  export const _toRdfResource: $_ToRdfResourceFunction<
    NodeShape1.Identifier,
    NodeShape1
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        NodeShape1.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
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

  export const fromJson: $FromJsonObjectFunction<
    NodeShape1.Json,
    NodeShape1.Discriminated,
    undefined
  > = (jsonObject, options = {}) =>
    $sequenceRecord({
      $identifier: $iriFromJsonString<string>(jsonObject["@id"], {
        ...options,
        schema: NodeShape1.schema.properties.$identifier.type,
      }),
      iriProperty: $iriFromJsonString<string>(jsonObject["iriProperty"], {
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
                resolver: $missingResolver,
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
    "@type": string;
    iriProperty: string;
    langStringProperty: $LangStringJsonObject[];
    nodeProperty: $DefaultPartial.Json;
    stringProperty: string;
  };

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
  readonly labels: readonly Literal[];
};

export namespace NodeShape2 {
  export const _toRdfResource: $_ToRdfResourceFunction<
    NodeShape2.Identifier,
    NodeShape2
  > = (parameters) => {
    if (!parameters.ignoreRdfType) {
      parameters.resource.add(
        $rdf_type,
        NodeShape2.schema.properties.$rdfType.toRdfTypes,
        parameters.graph,
      );
    }
    parameters.resource.add(
      NodeShape2.schema.properties.labels.path,
      parameters.object.labels.flatMap((item) => [item]),
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

  export const fromJson: $FromJsonObjectFunction<
    NodeShape2.Json,
    NodeShape2.Discriminated,
    undefined
  > = (jsonObject, options = {}) =>
    $sequenceRecord({
      $identifier: $identifierFromJsonString(jsonObject["@id"], {
        ...options,
        schema: NodeShape2.schema.properties.$identifier.type,
      }),
      labels: $arrayFromJsonArray($langStringFromJsonObject)(
        jsonObject["labels"],
        {
          ...options,
          schema: NodeShape2.schema.properties.labels.type,
        },
      ),
    }).chain(NodeShape2.create);

  export type Identifier = BlankNode | NamedNode;
  export namespace Identifier {
    export const parse = $parseIdentifier;
  }

  export const isNodeShape2: $ObjectTypeGuardFunction<
    NodeShape2.Discriminated
  > = (object): object is NodeShape2.Discriminated =>
    object.$type === "NodeShape2";

  export type Json = {
    "@id": string;
    "@type": string;
    labels?: $LangStringJsonObject[];
  };

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
