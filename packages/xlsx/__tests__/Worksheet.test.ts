import path from "node:path";
import { describe, it } from "vitest";
import { Cell } from "../src/Cell.js";
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
      expect(cell!.value.extract() === "B");
    });
  });

  it("cells", ({ expect }) => {
    const worksheet = formulasWorkbook.worksheets[0];
    expect(
      worksheet.cells.filter(
        (cell) => cell.value.extract() instanceof Cell.Error,
      ),
    ).toHaveLength(0);
    expect(
      worksheet.cells.filter((cell) => cell.formula.isJust()),
    ).toHaveLength(18);
    expect(worksheet.cells.filter((cell) => cell.value.isJust())).toHaveLength(
      26,
    );
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
      "e1db92d8034a399de2b2b0ae99428ff70be1a30f8ce84d8adaa8952dfea20c1c",
    );
    expect(formulasWorkbook.worksheets[1].sha256).toStrictEqual(
      "816df721e60c678d43db0d36bcaf65aa3e850ec463d328803b32d9cef07ea069",
    );
    expect(formulasWorkbook.worksheets[2].sha256).toStrictEqual(
      "fdf5c24d1abda60f47def2f7739cb32b4c04addb2415e39feb15d680492b5183",
    );
  }, 10000);
});
