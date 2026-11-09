import type { DatasetCoreFactory, Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";
import type { Either } from "purify-ts";
import type { ResourceRow } from "./ResourceRow.js";
import { ResourceRowParser } from "./ResourceRowParser.js";

interface IntermediateObjectFunctions<IntermediateObjectT extends object> {
  fromJson: (jsonObject: object) => Either<Error, IntermediateObjectT>;
  toRdf: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

export class JsonResourceRowParser<
  IntermediateObjectT extends object,
> extends ResourceRowParser {
  private readonly datasetFactory: DatasetCoreFactory;
  private readonly intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>;

  constructor(
    intermediateObjectFunctions: IntermediateObjectFunctions<IntermediateObjectT>,
    {
      datasetFactory,
      ...superParameters
    }: { datasetFactory: DatasetCoreFactory } & ConstructorParameters<
      typeof ResourceRowParser
    >[0],
  ) {
    super(superParameters);
    this.datasetFactory = datasetFactory;
    this.intermediateObjectFunctions = intermediateObjectFunctions;
  }

  override parse(resourceRow: ResourceRow): Either<Error, readonly Quad[]> {
    return this.intermediateObjectFunctions
      .fromJson(resourceRow)
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
