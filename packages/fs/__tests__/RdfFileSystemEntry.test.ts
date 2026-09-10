import path from "node:path";
import { describe, it } from "vitest";
import { RdfDirectory } from "../src/RdfDirectory.js";
import { RdfFile } from "../src/RdfFile.js";
import { RdfFileSystemEntry } from "../src/RdfFileSystemEntry.js";
import { testDataDirPath } from "./paths.js";

describe("RdfFileSystemEntry", () => {
  it("fromPath (directory)", async ({ expect }) => {
    expect(
      (await RdfFileSystemEntry.fromPath(testDataDirPath)).unsafeCoerce(),
    ).toBeInstanceOf(RdfDirectory);
  });

  it("fromPath (file)", async ({ expect }) => {
    expect(
      (
        await RdfFileSystemEntry.fromPath(
          path.join(testDataDirPath, "unesco-thesaurus.nt"),
        )
      ).unsafeCoerce(),
    ).toBeInstanceOf(RdfFile);
  });
});
