import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";
import type { Either } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

interface IntermediateObjectFunctions<IntermediateObjectT extends object> {
  fromJson: (
    jsonObject: object,
    options?: {
      defaultNamespace?: NamespaceBuilder;
      prefixMap?: PrefixMap;
    },
  ) => Either<Error, IntermediateObjectT>;
  toRdf: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

export class JsonResourceRecordParser<IntermediateObjectT extends object>
  extends AbstractParser
  implements ResourceRecordParser
{
  private readonly intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>;

  constructor(
    intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>,
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
  parse(resourceRecord: ResourceRecord): Either<Error, readonly Quad[]> {
    return this.intermediateObjectFunctions
      .fromJson(resourceRecord, {
        defaultNamespace: this.defaultNamespace.extract(),
        prefixMap: this.prefixMap.extract(),
      })
      .map((object) => [
        ...this.intermediateObjectFunctions.toRdf(object, {
          resourceSet: new ResourceSet({
            dataFactory: this.dataFactory,
            dataset: this.datasetFactory.dataset(),
          }),
        }).dataset,
      ]);
  }
}
