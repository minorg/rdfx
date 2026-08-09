import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { describe } from "vitest";
import { testGraphStore } from "../../graph-store/__tests__/testGraphStore.js";
import { TinyBaseGraphStore } from "../src/TinyBaseGraphStore.js";
import { logger } from "./logger.js";

describe("TinyBaseGraphStore", () => {
  testGraphStore((use) =>
    use(
      new TinyBaseGraphStore({
        dataFactory,
        datasetFactory,
        logger,
      }),
    ),
  );
});
