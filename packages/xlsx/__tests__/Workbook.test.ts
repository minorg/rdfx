import { beforeAll, describe, it } from "vitest";
import { Workbook } from "../src/Workbook.js";
import { Worksheet } from "../src/Worksheet.js";
import { readTestWorkbook } from "./readTestWorkbook.js";

describe("Workbook", async () => {
  let sut: Workbook;

  beforeAll(async () => {
    sut = await readTestWorkbook("formulas.xlsx");
  });

  describe("builder", () => {
    it("from row arrays", ({ expect }) => {
      const workbook = new Workbook.Builder()
        .addWorksheet(
          new Worksheet.Builder({ name: "Test" }).addRows(
            ["test1", "test2"],
            ["test3", "test4"],
          ),
        )
        .build();
      expect(workbook.worksheets).toHaveLength(1);
      const worksheet = workbook.worksheet("Test").unsafeCoerce();
      expect(worksheet.rows).toHaveLength(2);
      expect(
        worksheet.rows[0].toArray().map((_) => _?.value.extract()),
      ).toEqual(["test1", "test2"]);
      expect(
        worksheet.rows[1].toArray().map((_) => _?.value.extract()),
      ).toEqual(["test3", "test4"]);
    });

    it("from row records", ({ expect }) => {
      const workbook = new Workbook.Builder()
        .addWorksheet(
          new Worksheet.Builder({ name: "Test" }).addRows(
            {
              header1: ["value1.1.1", "value1.1.2"],
              header2: "value1.2",
            },
            {
              header1: "value2.1",
              header3: "value2.3",
            },
            {
              header1: "value3.1",
              header2: ["value3.2.1", "value3.2.2"],
            },
          ),
        )
        .build();
      expect(workbook.worksheets).toHaveLength(1);
      const worksheet = workbook.worksheet("Test").unsafeCoerce();
      expect(worksheet.rows).toHaveLength(4);
      expect(
        worksheet.rows[0].toArray().map((_) => _?.value.extract()),
      ).toEqual(["header1", "header1", "header2", "header3", "header2"]);
      expect(
        worksheet.rows[1].toArray().map((_) => _?.value.extract()),
      ).toEqual(["value1.1.1", "value1.1.2", "value1.2", undefined, undefined]);
      expect(
        worksheet.rows[2].toArray().map((_) => _?.value.extract()),
      ).toEqual(["value2.1", undefined, undefined, "value2.3", undefined]);
      expect(
        worksheet.rows[3].toArray().map((_) => _?.value.extract()),
      ).toEqual(["value3.1", undefined, "value3.2.1", undefined, "value3.2.2"]);
    });
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
