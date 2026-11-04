import { describe, it } from "vitest";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Workbook", async () => {
  it("sha256", async ({ expect }) => {
    const workbook = await readTestWorkbook("formulas.xlsx");
    expect(workbook.sha256).toStrictEqual(
      "67e2889be75ee0fb83f284b02201c68289a8d6d5d1937ef4e920e81069b42dc1",
    );
  });
});
