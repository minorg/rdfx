import type { Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";

import type { Either } from "purify-ts";

import type { ResourceRow } from "./ResourceRow.js";
import type { ResourceRowParser } from "./ResourceRowParser.js";

interface IntermediateObjectFunctions<IntermediateObjectT extends object> {
  fromJson: (jsonObject: object) => Either<Error, IntermediateObjectT>;
  toRdf: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

export class JsonResourceRowParser<IntermediateObjectT extends object>
  implements ResourceRowParser
{
  private readonly intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>;

  constructor(
    intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>,
  ) {
    this.intermediateObjectFunctions = intermediateObjectFunctions;
  }

  parse(
    resourceRow: ResourceRow,
    { dataFactory, datasetFactory }: Parameters<ResourceRowParser["parse"]>[1],
  ): Either<Error, readonly Quad[]> {
    return this.intermediateObjectFunctions
      .fromJson(resourceRow)
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
