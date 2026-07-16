import type { DatasetCore, Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
// @ts-expect-error
import housemd from "housemd";

export const houseMdDataset: DatasetCore = datasetFactory.dataset(
  housemd({ factory: dataFactory }) as Quad[],
);
