import { datasetFactory, PrefixMap } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import { RdfDirectory } from "../src/RdfDirectory.js";
import { testDataDirPath } from "./paths.js";

describe("RdfDirectory", () => {
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
