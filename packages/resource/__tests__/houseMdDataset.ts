import datasetFactory from "@rdfjs/dataset";
import type { DatasetCore, Quad } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
// @ts-expect-error
import housemd from "housemd";

export const houseMdDataset: DatasetCore = datasetFactory.dataset(
  housemd({ factory: dataFactory }) as Quad[],
);
