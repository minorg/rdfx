import path from "node:path";
import { describe, it } from "vitest";
import { CellAddress } from "../src/CellAddress.js";
import { snapshotsDirectoryPath } from "./paths.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Cell", async () => {
  const workbookFileName = "formulas.xlsx";
  const workbook = await readTestWorkbook(workbookFileName);

  it("dependencies", async ({ expect }) => {
    expect(workbook.worksheets).not.toHaveLength(0);
    for (const worksheet of workbook.worksheets) {
      await expect(
        worksheet.cells.reduce(
          (acc, cell) => {
            if (cell.formula.isJust()) {
              const dependencies = cell.dependencies.unsafeCoerce();
              if (dependencies.length > 0) {
                acc.push([
                  cell.address.string,
                  cell.formula.extract(),
                  dependencies.map((dependency) =>
                    dependency instanceof CellAddress
                      ? dependency.string
                      : dependency.address.string,
                  ),
                ]);
              }
            }
            return acc;
          },
          [] as [string, string, readonly string[]][],
        ),
      ).toMatchFileSnapshot(
        path.join(
          snapshotsDirectoryPath(workbookFileName, worksheet),
          "cellDependencies.snap.json",
        ),
      );
    }
  }, 30000);

  it("formula", ({ expect }) => {
    expect(
      workbook.worksheets[0].cell("D1").unsafeCoerce().formula.extract(),
    ).toBeUndefined();
    expect(
      workbook.worksheets[0].cell("D2").unsafeCoerce().formula.extract(),
    ).toStrictEqual("B2*C2");
  });

  describe("value", () => {
    it("empty", ({ expect }) => {
      const cell = workbook.worksheets[0].cell("D2").unsafeCoerce();
      expect(cell.value.extract()).toBeUndefined();
    });

    it("number", ({ expect }) => {
      const cell = workbook.worksheets[0].cell("B2").unsafeCoerce();
      expect(cell.value.extract()).toStrictEqual(2.5);
    });

    it("string", ({ expect }) => {
      const cell = workbook.worksheets[0].cell("A2").unsafeCoerce();
      expect(cell.value.extract()).toStrictEqual("A");
    });
  });
});
