import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, it } from "vitest";
import { logger } from "./logger.js";
import { readTestWorkbook } from "./readTestWorkbook.js";
import "@rdfx/testing";
import { PrefixMapWorksheetParser } from "../src/PrefixMapWorksheetParser.js";
import type { Worksheet } from "../src/Worksheet.js";

describe("PrefixMapWorksheetParser", async () => {
  const sut = new PrefixMapWorksheetParser({
    dataFactory,
    logger,
  });
  let worksheet: Worksheet;

  beforeAll(async () => {
    const workbook = await readTestWorkbook("resources.xlsx");
    worksheet = workbook.worksheet("$PrefixMap").unsafeCoerce();
  });

  it("parse", ({ expect }) => {
    const prefixMap = sut.parse(worksheet).unsafeCoerce();
    expect(prefixMap.size).toStrictEqual(3);
    expect(prefixMap.get("")?.value).toStrictEqual("http://example.com/");
    expect(prefixMap.get("ex")?.value).toStrictEqual("http://example.com/");
    expect(prefixMap.get("schema")?.value).toStrictEqual("http://schema.org/");
  });
});
