import path from "node:path";
import { fileURLToPath } from "node:url";
import datasetFactory from "@rdfjs/dataset";
import PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import { RdfDirectory } from "../src/RdfDirectory.js";

describe("RdfDirectory", () => {
  const testDataDirPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
  );
  const sut = new RdfDirectory(testDataDirPath);

  it("files", async ({ expect }) => {
    let count = 0;
    for await (const _ of sut.files()) {
      count++;
    }
    expect(count).toStrictEqual(6);
  });

  it("parse", async ({ expect }) => {
    const prefixMap = new PrefixMap(undefined, { factory: dataFactory });
    const dataset = (
      await sut.parseInto(datasetFactory.dataset(), { prefixMap })
    ).unsafeCoerce();
    expect(dataset.size).toBe(88482 + 6); // The UNESCO datasets are all duplicates
    expect(prefixMap.size).toBe(8); // place.jsonld and unesco-thesaurus.ttl
  }, 30000);
});
