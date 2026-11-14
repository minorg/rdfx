import { beforeAll, describe, it } from "vitest";
import type { Workbook } from "../src/Workbook.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Workbook", async () => {
  let sut: Workbook;

  beforeAll(async () => {
    sut = await readTestWorkbook("formulas.xlsx");
  });

  it("sha256", ({ expect }) => {
    expect(sut.sha256).toStrictEqual(
      "ca4cf5db9796434f86adeab2d70c9546af73a4a8f91e3b499838d3610a70638a",
    );
  });

  it("worksheet", ({ expect }) => {
    expect(sut.worksheet(0).extract()?.name).toStrictEqual("Data");
    expect(sut.worksheet("Config").extract()).toBeDefined();
  });
});
