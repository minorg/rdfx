import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { testVersionedGraphStore } from "@rdfx/graph-store/__tests__/testVersionedGraphStore.js";
import * as git from "isomorphic-git";
import { describe } from "vitest";
import { VersionedRdfDirectoryGraphStore } from "../src/VersionedRdfDirectoryGraphStore.js";
import { logger } from "./logger.js";

describe("VersionedRdfDirectoryGraphStore", () => {
  testVersionedGraphStore("nonextantversion", async (use) => {
    await using directoryPath = await fs.promises.mkdtempDisposable(
      path.join(os.tmpdir(), "VersionedRdfDirectoryGraphStore.test"),
    );
    await git.init({ fs, dir: directoryPath.path });

    const ignoreFileHandle = await fs.promises.open(
      path.join(directoryPath.path, "README.md"),
      "w+",
    );
    await ignoreFileHandle.close();

    await use(
      new VersionedRdfDirectoryGraphStore(directoryPath.path, { logger }),
    );
  });
});
