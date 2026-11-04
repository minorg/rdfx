import { invariant } from "ts-invariant";
import { Memoize } from "typescript-memoize";

export class CellAddress {
  /**
   * Zero-based column index.
   **/
  readonly columnIndex: number;

  /**
   * Type discriminant.
   */
  readonly kind = "CellAddress";

  /**
   * Zero-based row index
   */
  readonly rowIndex: number;

  /**
   * Worksheet name.
   */
  readonly worksheetName: string;

  constructor({
    columnIndex,
    rowIndex,
    worksheetName,
  }: { columnIndex: number; rowIndex: number; worksheetName: string }) {
    invariant(Number.isInteger(columnIndex) && columnIndex >= 0, columnIndex);
    invariant(Number.isInteger(rowIndex) && rowIndex >= 0, rowIndex);
    this.columnIndex = columnIndex;
    this.rowIndex = rowIndex;
    // Strip quotes off the worksheet name
    if (
      worksheetName.length >= 2 &&
      worksheetName.startsWith("'") &&
      worksheetName.endsWith("'")
    ) {
      // unescape double single-quotes -> single quote
      worksheetName = worksheetName.slice(1, -1).replace(/''/g, "'");
    }
    this.worksheetName = worksheetName;
  }

  @Memoize()
  get columnLetter(): string {
    let letter = "";
    let n = this.columnIndex + 1;
    while (n > 0) {
      letter = String.fromCharCode(((n - 1) % 26) + 65) + letter;
      n = Math.floor((n - 1) / 26);
    }
    return letter;
  }

  @Memoize()
  get string(): string {
    const quotedSheetName = /[^A-Za-z0-9_]/.test(this.worksheetName)
      ? // escape single quotes by doubling them
        `'${this.worksheetName.replace(/'/g, "''")}'`
      : this.worksheetName;
    return `${quotedSheetName}!${this.columnLetter}${this.rowIndex + 1}`;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.string;
  }
}
