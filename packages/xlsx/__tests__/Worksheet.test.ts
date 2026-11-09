import path from "node:path";
import { describe, it } from "vitest";
import type { ValueCell } from "../src/ValueCell.js";
import { snapshotsDirectoryPath } from "./paths.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Worksheet", async () => {
  const formulasWorkbook = await readTestWorkbook("formulas.xlsx");

  describe("cell", () => {
    it("absent", ({ expect }) => {
      const worksheet = formulasWorkbook.worksheets[0];
      const cell = worksheet.cell("F1").extract();
      expect(cell).toBeUndefined();
    });

    it("present", ({ expect }) => {
      const worksheet = formulasWorkbook.worksheets[0];
      const cell = worksheet.cell("A2").extract();
      expect(cell).toBeDefined();
      expect(cell!.kind).toStrictEqual("ValueCell");
      expect((cell as ValueCell).value === "B");
    });
  });

  it("cells", ({ expect }) => {
    const worksheet = formulasWorkbook.worksheets[0];
    expect(
      worksheet.cells.filter((cell) => cell.kind === "ErrorCell"),
    ).toHaveLength(0);
    expect(
      worksheet.cells.filter((cell) => cell.kind === "FormulaCell"),
    ).toHaveLength(18);
    expect(
      worksheet.cells.filter((cell) => cell.kind === "ValueCell"),
    ).toHaveLength(26);
  });

  it("definedNames", async ({ expect }) => {
    const workbookFileName = "defined_names.xlsx";
    const workbook = await readTestWorkbook(workbookFileName);
    expect(workbook.worksheets).not.toHaveLength(0);
    for (const worksheet of workbook.worksheets) {
      await expect(worksheet.definedNames).toMatchFileSnapshot(
        path.join(
          snapshotsDirectoryPath(workbookFileName, worksheet),
          "definedNames.snap.json",
        ),
      );
    }
  });

  it("rows", ({ expect }) => {
    const worksheet = formulasWorkbook.worksheets[0];
    expect(worksheet.rows).toHaveLength(17);
    for (const row of worksheet.rows) {
      expect(row.length).toBeGreaterThanOrEqual(4);
      expect(row.length).toBeLessThanOrEqual(5);
    }
    expect(worksheet.rows[4].every((cell) => cell === undefined)).toStrictEqual(
      true,
    );
    for (const row of worksheet.rows.slice(5)) {
      expect(row[0]).toBeDefined();
      expect(row[1]).toBeUndefined();
      expect(row[2]).toBeUndefined();
      expect(row[3]).toBeDefined();
      expect(row[4]).toBeUndefined();
    }
  });

  it("sha256", ({ expect }) => {
    expect(formulasWorkbook.worksheets).toHaveLength(3);
    expect(formulasWorkbook.worksheets[0].sha256).toStrictEqual(
      "b488df6999a887a63339072f67f91582f0d59be0c6705e860564dd59e9bc52d4",
    );
    expect(formulasWorkbook.worksheets[1].sha256).toStrictEqual(
      "390eb44b27a0971fc215183d832cb95e00568f994075c76eaa25fe03ae03ec6c",
    );
    expect(formulasWorkbook.worksheets[2].sha256).toStrictEqual(
      "6382c811b600dbaffeb7c8f664cdc3d11dc9e9678176400dc2f3efeef29a0569",
    );
  });
});
