import path from "node:path";
import { fileURLToPath } from "node:url";
import datasetFactory from "@rdfjs/dataset";
import { describe, it } from "vitest";
import { RdfDirectory } from "../src/RdfDirectory.js";

describe("RdfDirectory", () => {
  const testDataDirPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
  );
  const sut = new RdfDirectory({ path: testDataDirPath });

  it("files", async ({ expect }) => {
    let count = 0;
    for await (const _ of sut.files()) {
      count++;
    }
    expect(count).toStrictEqual(6);
  });

  it("parse", async ({ expect }) => {
    const dataset = (
      await sut.parseInto(datasetFactory.dataset())
    ).unsafeCoerce();
    expect(dataset.size).toBe(88482 + 6); // The UNESCO datasets are all duplicates
  }, 30000);
});
