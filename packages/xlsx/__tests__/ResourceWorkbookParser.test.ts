import namespace from "@rdfjs/namespace";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, it } from "vitest";
import { JsonResourceRecordParser } from "../src/JsonResourceRecordParser.js";
import { ResourceWorkbookParser } from "../src/ResourceWorkbookParser.js";
import type { Workbook } from "../src/Workbook.js";
import { logger } from "./logger.js";
import { readTestWorkbook } from "./readTestWorkbook.js";
import {
  $RdfjsDatasetObjectSet,
  NodeShape1,
  NodeShape2,
} from "./xlsx-shapes.shaclmate.js";
import "@rdfx/testing";
import { Maybe } from "purify-ts";

describe("ResourceWorkbookParser", async () => {
  const ex = namespace("http://example.com/");
  const sut = new ResourceWorkbookParser({
    dataFactory,
    datasetFactory,
    defaultNamespace: Maybe.of(ex),
    logger,
    prefixMap: Maybe.empty(),
    resourceRecordParsersByWorksheetName: {
      NodeShape1: (parameters) =>
        new JsonResourceRecordParser(NodeShape1, parameters),
      NodeShape2: (parameters) =>
        new JsonResourceRecordParser(NodeShape2, parameters),
    },
  });
  let workbook: Workbook;

  beforeAll(async () => {
    workbook = await readTestWorkbook("resources.xlsx");
  });

  describe("parse", () => {
    let parsedObjectSet: $RdfjsDatasetObjectSet;

    beforeAll(() => {
      const quads = sut.parse(workbook).unsafeCoerce();
      const dataset = datasetFactory.dataset(quads.concat());
      parsedObjectSet = new $RdfjsDatasetObjectSet(dataset);
    });

    it("counts", ({ expect }) => {
      expect(
        parsedObjectSet.nodeShape1CountSync().unsafeCoerce(),
      ).toStrictEqual(1);
      expect(
        parsedObjectSet.nodeShape2CountSync().unsafeCoerce(),
      ).toStrictEqual(1);
    });

    it("nodeShape1Id1", async ({ expect }) => {
      const nodeShape1Id1 = parsedObjectSet
        .nodeShape1Sync(ex("nodeShape1Id1"))
        .unsafeCoerce();
      expect(nodeShape1Id1.$identifier()).toEqualRdfTerm(ex("nodeShape1Id1"));
      expect(nodeShape1Id1.langStringProperty).toHaveLength(2);
      expect(nodeShape1Id1.langStringProperty).toEqualRdfTermSet([
        dataFactory.literal("enLangString1", "en"),
        dataFactory.literal("frLangString1", "fr"),
      ]);
      expect(nodeShape1Id1.nodeProperty.partial.$identifier()).toEqualRdfTerm(
        ex("nodeShape2Id1"),
      );
      const nodeShape2Id1 = (
        await nodeShape1Id1.nodeProperty.resolve()
      ).unsafeCoerce();
      expect(nodeShape2Id1.label).toEqualRdfTermSet([
        dataFactory.literal("enlabel1", "en"),
        dataFactory.literal("frlabel1", "fr"),
      ]);
      expect(nodeShape1Id1.stringProperty).toStrictEqual("string1");
    });
  });
});
