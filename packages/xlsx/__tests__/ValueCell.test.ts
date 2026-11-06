import { describe, it } from "vitest";
import type { ValueCell } from "../src/ValueCell.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("ValueCell", async () => {
  const workbookFileName = "formulas.xlsx";
  const workbook = await readTestWorkbook(workbookFileName);

  describe("value", () => {
    it("number", ({ expect }) => {
      const cell = workbook.worksheets[0].cell("B2").unsafeCoerce();
      expect(cell.kind).toStrictEqual("ValueCell");
      expect((cell as ValueCell).value).toStrictEqual(2.5);
    });

    it("string", ({ expect }) => {
      const cell = workbook.worksheets[0].cell("A2").unsafeCoerce();
      expect(cell.kind).toStrictEqual("ValueCell");
      expect((cell as ValueCell).value).toStrictEqual("A");
    });
  });
});
