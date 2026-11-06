import { describe, it } from "vitest";
import { CellAddress } from "../src/CellAddress.js";

describe("CellAddress", () => {
  describe("columnLetter", () => {
    it("A", ({ expect }) => {
      expect(
        new CellAddress({
          rowIndex: 0,
          columnIndex: 0,
          worksheetName: "Test",
        }).columnLetter,
      ).toStrictEqual("A");
    });

    it("AA", ({ expect }) => {
      const columnLetter = new CellAddress({
        rowIndex: 0,
        columnIndex: 26,
        worksheetName: "Test",
      }).columnLetter;
      expect(columnLetter).toStrictEqual("AA");
    });
  });

  it("parse", ({ expect }) => {
    const parsed = CellAddress.parse("A1", "Other");
    expect(parsed.columnIndex).toStrictEqual(0);
    expect(parsed.rowIndex).toStrictEqual(0);
    expect(parsed.worksheetName).toStrictEqual("Other");
  });

  describe("string", () => {
    it("Test!A1", ({ expect }) => {
      expect(
        new CellAddress({
          rowIndex: 0,
          columnIndex: 0,
          worksheetName: "Test",
        }).string,
      ).toStrictEqual("Test!A1");
    });

    it("Test!AA1", ({ expect }) => {
      expect(
        new CellAddress({
          rowIndex: 0,
          columnIndex: 26,
          worksheetName: "Test",
        }).string,
      ).toStrictEqual("Test!AA1");
    });
  });
});
