import type { DatasetCore } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { $Object } from "./shapes.js";

export function toRdfDataset(
  dataset: DatasetCore,
  ...objects: readonly $Object[]
): void {
  const resourceSet = new ResourceSet({ dataFactory, dataset });
  for (const object of objects) {
    $Object.toRdfResource(object, { resourceSet });
  }
}
