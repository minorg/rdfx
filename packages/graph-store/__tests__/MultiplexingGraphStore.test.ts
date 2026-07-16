import { datasetFactory } from "@rdfx/collection";
import { describe } from "vitest";
import { MultiplexingGraphStore } from "../src/MultiplexingGraphStore.js";
import { RdfjsDatasetGraphStore } from "../src/RdfjsDatasetGraphStore.js";
import { testGraphStore } from "./testGraphStore.js";

describe("MultiplexingGraphStore", () => {
  testGraphStore((use) =>
    use(
      new MultiplexingGraphStore(
        new RdfjsDatasetGraphStore(datasetFactory.dataset()),
        new RdfjsDatasetGraphStore(datasetFactory.dataset()),
      ),
    ),
  );
});
