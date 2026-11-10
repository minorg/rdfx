import path from "node:path";
import { describe, it } from "vitest";
import type { FormulaCell } from "../src/FormulaCell.js";
import { snapshotsDirectoryPath } from "./paths.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("FormulaCell", async () => {
  const workbookFileName = "formulas.xlsx";
  const workbook = await readTestWorkbook(workbookFileName);

  it("dependencies", async ({ expect }) => {
    expect(workbook.worksheets).not.toHaveLength(0);
    for (const worksheet of workbook.worksheets) {
      await expect(
        worksheet.cells.reduce(
          (acc, cell) => {
            if (cell.kind === "Formula") {
              const dependencies = cell.dependencies.unsafeCoerce();
              if (dependencies.length > 0) {
                acc.push([
                  cell.address.string,
                  cell.formula,
                  dependencies.map((dependency) =>
                    dependency.kind === "CellAddress"
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
    const cell = workbook.worksheets[0].cell("D2").unsafeCoerce();
    expect(cell.kind).toStrictEqual("Formula");
    expect((cell as FormulaCell).formula).toStrictEqual("B2*C2");
  });

  it("value", ({ expect }) => {
    const cell = workbook.worksheets[0].cell("D2").unsafeCoerce();
    expect(cell.kind).toStrictEqual("Formula");
    expect((cell as FormulaCell).value.extract()).toBeUndefined();
  });
});
