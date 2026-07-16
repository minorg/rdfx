import { datasetFactory } from "@rdfx/collection";
import { describe } from "vitest";
import { RdfjsDatasetGraphStore } from "../src/RdfjsDatasetGraphStore.js";
import { testGraphStore } from "./testGraphStore.js";

describe("RdfjsDatasetGraphStore", () => {
  testGraphStore((use) =>
    use(new RdfjsDatasetGraphStore(datasetFactory.dataset())),
  );
});
