import type { Logger } from "@rdfx/logger";
import type { DepParser } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Memoize } from "typescript-memoize";
import * as xlsx from "xlsx";

import { Cell } from "./Cell.js";
import { CellAddress } from "./CellAddress.js";
import { Row } from "./Row.js";
import type { Workbook } from "./Workbook.js";

export class Worksheet {
  readonly #definedNames: readonly xlsx.DefinedName[];
  private readonly delegate: xlsx.WorkSheet;
  private readonly depParser: DepParser;
  private readonly index: number;
  private readonly logger: Logger;

  readonly hidden: boolean;
  readonly name: string;
  readonly workbook: Workbook;

  constructor({
    definedNames,
    delegate,
    depParser,
    hidden,
    index,
    logger,
    name,
    workbook,
  }: {
    definedNames: readonly xlsx.DefinedName[];
    delegate: xlsx.WorkSheet;
    depParser: DepParser;
    hidden: boolean;
    index: number;
    logger: Logger;
    name: string;
    workbook: Workbook;
  }) {
    this.#definedNames = definedNames;
    this.delegate = delegate;
    this.depParser = depParser;
    this.hidden = hidden;
    this.index = index;
    this.logger = logger;
    this.name = name;
    this.workbook = workbook;
  }

  /**
   * Array of all cells.
   */
  @Memoize()
  get cells(): readonly Cell[] {
    return [...this.cellsByAddress.values()];
  }

  /**
   * Sparse map of cell address strings (qualified with sheet name: "Sheet!A1") to cells,
   * mirroring the way .xlsx stores cells natively.
   */
  @Memoize()
  get cellsByAddress(): ReadonlyMap<string, Cell> {
    const cellsByAddress = new Map<string, Cell>();

    for (const [cellAddressString, cellAny] of Object.entries(this.delegate)) {
      // SheetJS uses keys like '!ref', '!margins' etc for metadata
      if (cellAddressString.startsWith("!")) {
        continue;
      }
      const cellObject = cellAny as xlsx.CellObject;

      const cellAddress = CellAddress.parse(cellAddressString, this.name);

      const hyperlink = cellObject.l
        ? Maybe.of({
            target: cellObject.l.Target,
            tooltip: Maybe.fromNullable(cellObject.l.Tooltip),
          })
        : Maybe.empty();

      let value: Maybe<Cell.Value>;
      switch (cellObject.t) {
        case "b": // Boolean
        case "d": // Date
        case "n": // Number
        case "s": // String
          value = Maybe.fromNullable(cellObject.v);
          break;
        case "e": // Error
          invariant(cellObject.w);
          value = Maybe.of(new Cell.Error(cellObject.w!));
          break;
        case "z": // Empty
          value = Maybe.empty();
          break;
        default:
          throw new RangeError(
            `${cellAddress}: unexpected cell object type: ${cellObject.t}`,
          );
      }

      let formula: Maybe<string>;
      if (cellObject.f === "undefined") {
        formula = Maybe.empty();
        value = Maybe.of(new Cell.Error("unparseable formula or macro"));
      } else {
        formula = Maybe.fromNullable(cellObject.f);
      }

      const cell = new Cell({
        address: cellAddress,
        depParser: this.depParser,
        hyperlink,
        formula,
        value,
        worksheet: this,
      });

      invariant(!cellsByAddress.has(cell.address.string), cell.address.string);
      cellsByAddress.set(cell.address.string, cell);
    }

    return cellsByAddress;
  }

  /**
   * All rows following the header row.
   */
  @Memoize()
  get dataRows(): readonly Row[] {
    return this.rows.slice(1);
  }

  /**
   * Get defined names from the perspective of this worksheet.
   *
   * The result will include:
   * - worksheet-local names
   * - workbook-global names that aren't overridden by a worksheet-local name
   */
  @Memoize()
  get definedNames(): readonly [CellAddress, string][] {
    const result = new Map<string, [CellAddress, string]>();

    for (const scope of ["worksheet", "workbook"] as const) {
      for (const definedName of this.#definedNames) {
        if (
          (scope === "worksheet" && definedName.Sheet === this.index) ||
          (scope === "workbook" && typeof definedName.Sheet === "undefined")
        ) {
          const refMatch = definedName.Ref.match(
            /^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)$/,
          );
          if (!refMatch) {
            continue; // Ref is not to a single cell
          }

          const refWorksheetName = refMatch[1] || refMatch[2];
          const refCol = refMatch[3];
          const refRow = refMatch[4];
          const refDecodedCell = xlsx.utils.decode_cell(`${refCol}${refRow}`); // { r: 0, c: 0 } (0-based)
          const refCellAddress = new CellAddress({
            columnIndex: refDecodedCell.c,
            rowIndex: refDecodedCell.r,
            worksheetName: refWorksheetName ?? this.name,
          });

          if (scope === "worksheet") {
            if (result.has(definedName.Name)) {
              this.logger.warn(
                "duplicate worksheet-local defined name %s for cell %s",
                definedName.Name,
                refCellAddress,
              );
              continue;
            }
          } else {
            if (result.has(definedName.Name)) {
              this.logger.debug(
                "workbook-global name %s overridden by worksheet-local name",
                definedName.Name,
              );
              continue;
            }
          }

          result.set(definedName.Name, [refCellAddress, definedName.Name]);
        }
      }
    }

    return [...result.values()];
  }

  /**
   * Header row, an array of strings.
   */
  @Memoize()
  get headerRow(): Maybe<readonly (string | undefined)[]> {
    if (this.rows.length === 0) {
      return Maybe.empty();
    }

    const headerRow: (string | undefined)[] = [];
    for (const [columnI, cell] of this.rows[0].toArray().entries()) {
      const logContext = {
        column: columnI,
        worksheet: { name: this.name },
        row: 0,
      };

      if (cell === undefined) {
        this.logger.warn(logContext, "header cell is empty");
        headerRow.push(undefined);
        continue;
      }

      const cellValue = cell.value.extract();
      if (cellValue === undefined) {
        this.logger.warn(logContext, "header cell has no value");
        headerRow.push(undefined);
        continue;
      }

      if (typeof cellValue !== "string") {
        this.logger.warn(
          logContext,
          "header cell has %s value",
          typeof cellValue,
        );
        headerRow.push(undefined);
        continue;
      }

      const stringCellValue = cellValue.trim();
      if (stringCellValue.length === 0) {
        this.logger.warn(logContext, "header cell has empty/blank value");
        continue;
      }

      headerRow.push(stringCellValue);
    }

    return Maybe.of(headerRow);
  }

  /**
   * Array of rows, including any row that has a populated cell (i.e., within the !ref range of the worksheet).
   */
  @Memoize()
  get rows(): readonly Row[] {
    const worksheetRange = xlsx.utils.decode_range(
      this.delegate["!ref"] || "A1",
    );
    const rows: Row[] = [];
    for (let r = worksheetRange.s.r; r <= worksheetRange.e.r; ++r) {
      const cells: (Cell | undefined)[] = [];
      for (let c = worksheetRange.s.c; c <= worksheetRange.e.c; ++c) {
        cells.push(
          this.cellsByAddress.get(
            CellAddress.parse(xlsx.utils.encode_cell({ c, r }), this.name)
              .string,
          ),
        );
      }
      rows.push(
        new Row({ cells, index: r, logger: this.logger, worksheet: this }),
      );
    }
    return rows;
  }

  /**
   * SHA-256 sha256 hex digest of this worksheet.
   */
  @Memoize()
  get sha256(): string {
    const hasher = sha256.create();
    for (const cell of this.cells) {
      hasher.update(cell.sha256);
    }
    return hasher.hex();
  }

  cell(address: CellAddress | string): Maybe<Cell> {
    return Maybe.fromNullable(
      this.cellsByAddress.get(
        typeof address === "object"
          ? address.string
          : CellAddress.parse(address, this.name).string,
      ),
    );
  }

  @Memoize()
  toString(): string {
    return `Worksheet(name=${this.name})`;
  }
}

export namespace Worksheet {
  export class Builder {
    private headerRow: string[] | undefined;
    private dataRows: (xlsx.CellObject | undefined)[][] = [];
    readonly name: string;

    constructor({ name }: { name: string }) {
      this.name = name;
    }

    addRows(...rows: readonly Builder.Row[]): this {
      for (const row of rows) {
        if (Array.isArray(row)) {
          this.dataRows.push(
            row.map((cell) =>
              cell !== undefined ? this.cellToCellObject(cell) : undefined,
            ),
          );
        } else {
          if (!this.headerRow) {
            this.headerRow = [];
          }

          const dataRow: (xlsx.CellObject | undefined)[] = [];
          for (const [header, cells] of Object.entries(row)) {
            const cellsArray = Array.isArray(cells) ? cells : [cells];

            let headerRowIndex: number | undefined;
            for (const cell of cellsArray) {
              headerRowIndex = this.headerRow.indexOf(
                header,
                headerRowIndex === undefined ? 0 : headerRowIndex + 1,
              );
              if (headerRowIndex === -1) {
                headerRowIndex = this.headerRow.length;
                this.headerRow.push(header);
              }
              while (dataRow.length <= headerRowIndex) {
                dataRow.push(undefined);
              }
              dataRow[headerRowIndex] = this.cellToCellObject(cell);
            }
          }
          this.dataRows.push(dataRow);
        }
      }

      return this;
    }

    build(): xlsx.WorkSheet {
      let aoa: (xlsx.CellObject | string | undefined)[][];
      const headerRow = this.headerRow;
      if (headerRow) {
        aoa = [headerRow];
        aoa = aoa.concat(
          this.dataRows.map((dataRow) => {
            // Even out the rows
            while (dataRow.length < headerRow.length) {
              dataRow.push(undefined);
            }
            return dataRow;
          }),
        );
      } else {
        aoa = this.dataRows;
      }
      return xlsx.utils.aoa_to_sheet(aoa);
    }

    private cellToCellObject(cell: Builder.Cell): xlsx.CellObject {
      let formula: Maybe<string>;
      let hyperlink: Maybe<Cell.Hyperlink> | undefined;
      let value: Cell.Value | undefined;

      if (
        typeof cell === "object" &&
        !(cell instanceof Date) &&
        !(cell instanceof Cell.Error)
      ) {
        formula = cell.formula;
        hyperlink = cell.hyperlink;
        value = cell.value.extract();
      } else {
        formula = Maybe.empty();
        hyperlink = Maybe.empty();
        value = cell;
      }

      let t: xlsx.CellObject["t"];
      switch (typeof value) {
        case "boolean":
          t = "b";
          break;
        case "object":
          invariant(value instanceof Date);
          t = "d";
          break;
        case "number":
          t = "n";
          break;
        case "string":
          t = "s";
          break;
        case "undefined":
          t = "z";
          break;
        default:
          throw new RangeError(typeof value);
      }

      return {
        f: formula.extract(),
        l: hyperlink
          .map((hyperlink) => ({
            Target: hyperlink.target,
            Tooltip: hyperlink.tooltip.extract(),
          }))
          .extract(),
        t,
        v: value,
      };
    }
  }

  export namespace Builder {
    export type Cell =
      | {
          readonly formula: Maybe<string>;
          readonly hyperlink: Maybe<Cell.Hyperlink>;
          readonly value: Maybe<Cell.Value>;
        }
      | Cell.Value;

    export type Row =
      | readonly (Cell | undefined)[]
      | Record<string, Cell | readonly Cell[]>;
  }
}
