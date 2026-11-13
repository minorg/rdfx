import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";
import type { Either } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

interface IntermediateObjectFunctions<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
> {
  Json: {
    parse(json: unknown): Either<Error, JsonObjectT>;
  };

  fromJson: (
    jsonObject: JsonObjectT,
    options?: {
      defaultNamespace?: NamespaceBuilder;
      prefixMap?: PrefixMap;
    },
  ) => Either<Error, IntermediateObjectT>;

  toRdfResource: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

export class JsonResourceRecordParser<
    IntermediateObjectT extends object,
    JsonObjectT extends object,
  >
  extends AbstractParser
  implements ResourceRecordParser
{
  private readonly intermediateObjectFunctions: IntermediateObjectFunctions<
    IntermediateObjectT,
    JsonObjectT
  >;

  constructor(
    intermediateObjectFunctions: IntermediateObjectFunctions<
      IntermediateObjectT,
      JsonObjectT
    >,
    superParameters: ConstructorParameters<typeof AbstractParser>[0],
  ) {
    super(superParameters);
    this.intermediateObjectFunctions = intermediateObjectFunctions;
  }

  /**
   * Parse a ResourceRecord into an array of RDF Quads.
   *
   * Takes dataFactory, et al. parameters here rather than in the constructor in order to simplify construction.
   */
  parse(
    resourceRecord: ResourceRecord,
    options?: Parameters<ResourceRecordParser["parse"]>[1],
  ): Either<Error, readonly Quad[]> {
    return this.intermediateObjectFunctions.Json.parse(
      Object.fromEntries(
        Object.entries(resourceRecord).map(([key, value]) => {
          if (value instanceof Date) {
            value = value.toISOString();
          }
          return [key, value];
        }),
      ),
    ).chain((jsonObject) =>
      this.intermediateObjectFunctions
        .fromJson(jsonObject, {
          defaultNamespace: options?.defaultNamespace,
          prefixMap: options?.prefixMap,
        })
        .map((object) => [
          ...this.intermediateObjectFunctions.toRdfResource(object, {
            resourceSet: new ResourceSet({
              dataFactory: this.dataFactory,
              dataset: this.datasetFactory.dataset(),
            }),
          }).dataset,
        ]),
    );
  }
}
