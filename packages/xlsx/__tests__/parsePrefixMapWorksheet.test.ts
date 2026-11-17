import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, it } from "vitest";
import { logger } from "./logger.js";
import { readTestWorkbook } from "./readTestWorkbook.js";
import "@rdfx/testing";
import { parsePrefixMapWorksheet } from "../src/parsePrefixMapWorksheet.js";
import type { Worksheet } from "../src/Worksheet.js";

describe("parsePrefixMapWorksheet", async () => {
  let worksheet: Worksheet;

  beforeAll(async () => {
    const workbook = await readTestWorkbook("resources.xlsx");
    worksheet = workbook.worksheet("$PrefixMap").unsafeCoerce();
  });

  it("parse", ({ expect }) => {
    const prefixMap = parsePrefixMapWorksheet(worksheet, {
      dataFactory,
      logger,
    }).unsafeCoerce();
    expect(prefixMap.size).toStrictEqual(3);
    expect(prefixMap.get("")?.value).toStrictEqual("http://example.com/");
    expect(prefixMap.get("ex")?.value).toStrictEqual("http://example.com/");
    expect(prefixMap.get("schema")?.value).toStrictEqual("http://schema.org/");
  });
});
