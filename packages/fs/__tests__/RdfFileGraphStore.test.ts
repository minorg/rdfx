import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { testGraphStore } from "@rdfx/graph-store/__tests__/testGraphStore.js";
import { describe } from "vitest";
import { RdfFileGraphStore } from "../src/RdfFileGraphStore.js";
import { logger } from "./logger.js";

describe("RdfFileGraphStore", () => {
  describe("existing directory", () => {
    testGraphStore(async (use) => {
      await using directoryPath = await fs.mkdtempDisposable(
        path.join(os.tmpdir(), "RdfFileGraphStore.test"),
      );
      await use(
        new RdfFileGraphStore(path.join(directoryPath.path, "file.nq"), {
          logger,
        }),
      );
    });
  });

  describe("non-extant directory", () => {
    testGraphStore(async (use) => {
      await using directoryPath = await fs.mkdtempDisposable(
        path.join(os.tmpdir(), "RdfFileGraphStore.test"),
      );
      await use(
        new RdfFileGraphStore(
          path.join(directoryPath.path, "nonextant", "file.nq"),
          {
            logger,
          },
        ),
      );
    });
  });
});
