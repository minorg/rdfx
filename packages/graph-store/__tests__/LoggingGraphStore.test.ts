import { datasetFactory } from "@rdfx/collection";
import { dummyLogger } from "ts-log";
import { describe } from "vitest";
import { LoggingGraphStore } from "../src/LoggingGraphStore.js";
import { RdfjsDatasetGraphStore } from "../src/RdfjsDatasetGraphStore.js";
import { testGraphStore } from "./testGraphStore.js";

describe("LoggingGraphStore", () => {
  testGraphStore((use) =>
    use(
      new LoggingGraphStore(
        new RdfjsDatasetGraphStore(datasetFactory.dataset()),
        dummyLogger,
      ),
    ),
  );
});
