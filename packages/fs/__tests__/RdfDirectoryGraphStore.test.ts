import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { testGraphStore } from "@rdfx/graph-store/__tests__/testGraphStore.js";
import { describe } from "vitest";
import { RdfDirectoryGraphStore } from "../src/RdfDirectoryGraphStore.js";
import { logger } from "./logger.js";

describe("RdfDirectoryGraphStore", () => {
  testGraphStore(async (use) => {
    await using directoryPath = await fs.mkdtempDisposable(
      path.join(os.tmpdir(), "RdfDirectoryGraphStore.test"),
    );
    const ignoreFileHandle = await fs.open(
      path.join(directoryPath.path, "README.md"),
      "w+",
    );
    await ignoreFileHandle.close();
    await use(new RdfDirectoryGraphStore(directoryPath.path, { logger }));
  });
});
