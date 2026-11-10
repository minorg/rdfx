import type { Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";

import type { Either } from "purify-ts";

import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

interface IntermediateObjectFunctions<IntermediateObjectT extends object> {
  fromJson: (jsonObject: object) => Either<Error, IntermediateObjectT>;
  toRdf: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

export class JsonResourceRecordParser<IntermediateObjectT extends object>
  implements ResourceRecordParser
{
  private readonly intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>;

  constructor(
    intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>,
  ) {
    this.intermediateObjectFunctions = intermediateObjectFunctions;
  }

  parse(
    resourceRecord: ResourceRecord,
    {
      dataFactory,
      datasetFactory,
    }: Parameters<ResourceRecordParser["parse"]>[1],
  ): Either<Error, readonly Quad[]> {
    return this.intermediateObjectFunctions
      .fromJson(resourceRecord)
      .map((object) => [
        ...this.intermediateObjectFunctions.toRdf(object, {
          resourceSet: new ResourceSet({
            dataFactory,
            dataset: datasetFactory.dataset(),
          }),
        }).dataset,
      ]);
  }
}
