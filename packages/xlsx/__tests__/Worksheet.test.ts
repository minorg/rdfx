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

  it("sha256", async ({ expect }) => {
    expect(formulasWorkbook.worksheets).toHaveLength(3);
    expect(formulasWorkbook.worksheets[0].sha256).toStrictEqual(
      "512db8ed343112d55a87f1f47f74c50b698f762891b5d40160329ecfa8dd3b1e",
    );
    expect(formulasWorkbook.worksheets[1].sha256).toStrictEqual(
      "390eb44b27a0971fc215183d832cb95e00568f994075c76eaa25fe03ae03ec6c",
    );
    expect(formulasWorkbook.worksheets[2].sha256).toStrictEqual(
      "6382c811b600dbaffeb7c8f664cdc3d11dc9e9678176400dc2f3efeef29a0569",
    );
  });
});
