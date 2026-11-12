import { describe, it } from "vitest";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Workbook", async () => {
  it("sha256", async ({ expect }) => {
    const workbook = await readTestWorkbook("formulas.xlsx");
    expect(workbook.sha256).toStrictEqual(
      "ca4cf5db9796434f86adeab2d70c9546af73a4a8f91e3b499838d3610a70638a",
    );
  });
});
