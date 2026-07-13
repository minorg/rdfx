import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { testVersionedGraphStore } from "@rdfx/graph-store/__tests__/testVersionedGraphStore.js";
import * as git from "isomorphic-git";
import { describe } from "vitest";
import { VersionedRdfFileGraphStore } from "../src/VersionedRdfFileGraphStore.js";
import { logger } from "./logger.js";

describe("VersionedRdfFileGraphStore", () => {
  testVersionedGraphStore(async (use) => {
    await using directoryPath = await fs.promises.mkdtempDisposable(
      path.join(os.tmpdir(), "VersionedRdfFileGraphStore.test"),
    );
    await git.init({ fs, dir: directoryPath.path });

    await use(
      new VersionedRdfFileGraphStore(path.join(directoryPath.path, "file.nq"), {
        logger,
      }),
    );
  });
});
