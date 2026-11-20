import type { Logger } from "@rdfx/logger";

import { Memoize } from "typescript-memoize";
import { appendRecordValue } from "./appendRecordValue.js";
import type { Cell } from "./Cell.js";
import type { Worksheet } from "./Worksheet.js";

export class Row implements Iterable<Cell | undefined> {
  private readonly cells: readonly (Cell | undefined)[];
  private readonly logger: Logger;
  private readonly worksheet: Worksheet;

  readonly index: number;

  constructor({
    cells,
    index,
    logger,
    worksheet,
  }: {
    cells: readonly (Cell | undefined)[];
    index: number;
    logger: Logger;
    worksheet: Worksheet;
  }) {
    this.cells = cells;
    this.index = index;
    this.logger = logger;
    this.worksheet = worksheet;
  }

  get length(): number {
    return this.cells.length;
  }

  [Symbol.iterator](): Iterator<Cell | undefined> {
    return this.cells[Symbol.iterator]();
  }

  at(column: number): Cell | undefined {
    return this.cells.at(column);
  }

  toArray(): readonly (Cell | undefined)[] {
    return this.cells;
  }

  @Memoize()
  toRecord(): Record<string, Cell> {
    if (this.index === 0) {
      this.logger.warn(
        {
          worksheet: { name: this.worksheet },
          row: this.index,
        },
        "can't convert row 0 to a record",
      );
      return {};
    }

    const headerRow = this.worksheet.headerRow.extract();
    if (!headerRow) {
      this.logger.warn(
        {
          worksheet: { name: this.worksheet },
          row: this.index,
        },
        "worksheet has no header row",
      );
      return {};
    }

    const record: Record<string, Cell> = {};
    for (const [columnI, cell] of this.cells.entries()) {
      const logContext = {
        cell: cell ? { address: cell.address } : undefined,
        column: columnI,
        worksheet: { name: this.worksheet.name },
        row: this.index,
      };

      if (columnI >= headerRow.length) {
        this.logger.warn(
          logContext,
          "data row has more columns than header row",
        );
        continue;
      }

      if (cell === undefined) {
        this.logger.debug(logContext, "undefined data row cell");
        continue;
      }

      const header = headerRow[columnI];
      if (header === undefined) {
        this.logger.debug(logContext, "undefined header for data row cell");
        continue;
      }

      if (record[header] !== undefined) {
        this.logger.warn(logContext, "duplicate header: %s", header);
        continue;
      }

      record[header] = cell;
    }

    return record;
  }
}
