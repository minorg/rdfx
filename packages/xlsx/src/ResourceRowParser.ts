import type { DataFactory, Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import type { Logger } from "@rdfx/logger";
import { type Resource, ResourceSet } from "@rdfx/resource";
import type { Either } from "purify-ts";
import type { ResourceRow } from "./ResourceRow.js";

export type ResourceRowParser = (parameters: {
  dataFactory: DataFactory;
  logger: Logger;
  resourceRow: ResourceRow;
}) => Either<Error, readonly Quad[]>;

export namespace ResourceRowParser {
  export function fromGenerated<T>({
    fromJson,
    toRdf,
  }: {
    fromJson: (jsonObject: object) => Either<Error, T>;
    toRdf: (
      object: T,
      options?: {
        resourceSet?: ResourceSet;
      },
    ) => Resource;
  }): ResourceRowParser {
    return ({ dataFactory, resourceRow }) =>
      fromJson(resourceRow).map((object) => [
        ...toRdf(object, {
          resourceSet: new ResourceSet({
            dataFactory,
            dataset: datasetFactory.dataset(),
          }),
        }).dataset,
      ]);
  }
}
