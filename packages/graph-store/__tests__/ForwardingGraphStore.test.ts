import { datasetFactory } from "@rdfx/collection";
import { describe } from "vitest";
import { ForwardingGraphStore } from "../src/ForwardingGraphStore.js";
import { RdfjsDatasetGraphStore } from "../src/RdfjsDatasetGraphStore.js";
import { testGraphStore } from "./testGraphStore.js";

describe("ForwardingGraphStore", () => {
  testGraphStore((use) =>
    use(
      new ForwardingGraphStore(
        new RdfjsDatasetGraphStore(datasetFactory.dataset()),
      ),
    ),
  );
});
