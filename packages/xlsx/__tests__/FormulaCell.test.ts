import path from "node:path";
import { describe, it } from "vitest";
import { snapshotsDirectoryPath } from "./paths.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("FormulaCell", () => {
  it("dependencies", async ({ expect }) => {
    const workbookFileName = "formulas.xlsx";
    const workbook = await readTestWorkbook(workbookFileName);
    expect(workbook.worksheets).not.toHaveLength(0);
    for (const worksheet of workbook.worksheets) {
      await expect(
        worksheet.cells.reduce(
          (acc, cell) => {
            if (cell.kind === "FormulaCell") {
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
});
