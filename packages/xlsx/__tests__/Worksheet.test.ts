import path from "node:path";
import { describe, it } from "vitest";
import { snapshotsDirectoryPath } from "./paths.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Worksheet", async () => {
  it("defined names", async ({ expect }) => {
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

  it("cell dependencies", async ({ expect }) => {
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

  it("sha256", async ({ expect }) => {
    const workbook = await readTestWorkbook("formulas.xlsx");
    expect(workbook.worksheets).toHaveLength(3);
    expect(workbook.worksheets[0].sha256).toStrictEqual(
      "512db8ed343112d55a87f1f47f74c50b698f762891b5d40160329ecfa8dd3b1e",
    );
    expect(workbook.worksheets[1].sha256).toStrictEqual(
      "390eb44b27a0971fc215183d832cb95e00568f994075c76eaa25fe03ae03ec6c",
    );
    expect(workbook.worksheets[2].sha256).toStrictEqual(
      "6382c811b600dbaffeb7c8f664cdc3d11dc9e9678176400dc2f3efeef29a0569",
    );
  });
});
