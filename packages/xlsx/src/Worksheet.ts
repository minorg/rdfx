import type { Logger } from "@rdfx/logger";
import type { DepParser } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Memoize } from "typescript-memoize";
import * as xlsx from "xlsx";

import type { Cell } from "./Cell.js";
import { CellAddress } from "./CellAddress.js";
import { ErrorCell } from "./ErrorCell.js";
import { FormulaCell } from "./FormulaCell.js";
import { ValueCell } from "./ValueCell.js";
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

  @Memoize()
  get cells(): readonly Cell[] {
    return [...this.cellsByAddress.values()];
  }

  @Memoize()
  get cellsByAddress(): ReadonlyMap<string, Cell> {
    const cellsByAddress = new Map<string, Cell>();

    const addCell = (cell: Cell): void => {
      invariant(!cellsByAddress.has(cell.address.string), cell.address.string);
      cellsByAddress.set(cell.address.string, cell);
    };

    for (const [cellAddressString, cellAny] of Object.entries(this.delegate)) {
      // SheetJS uses keys like '!ref', '!margins' etc for metadata
      if (cellAddressString.startsWith("!")) {
        continue;
      }
      const cellObject = cellAny as xlsx.CellObject;

      const decodedCellAddress = xlsx.utils.decode_cell(cellAddressString); // { r: 0, c: 0 } (0-based)
      const cellAddress = new CellAddress({
        columnIndex: decodedCellAddress.c,
        rowIndex: decodedCellAddress.r,
        worksheetName: this.name,
      });

      switch (cellObject.t) {
        case "b": // Boolean
        case "d": // Date
        case "n": // Number
        case "s": // String
          break;

        case "e": {
          // Error
          addCell(
            new ErrorCell({
              address: cellAddress,
              message: cellObject.w!,
              worksheet: this,
            }),
          );
          continue;
        }
        case "z": // Empty
          continue;
        default:
          throw new RangeError(
            `${cellAddress}: unexpected cell object type: ${cellObject.t}`,
          );
      }

      const cellFormula = cellObject.f;
      if (!cellFormula) {
        if (typeof cellObject.v === "undefined") {
          throw new RangeError(
            `${cellAddress}: value cell has undefined value`,
          );
        }
        addCell(
          new ValueCell({
            address: cellAddress,
            value: cellObject.v!,
            worksheet: this,
          }),
        );
        continue;
      }

      if (cellFormula === "undefined") {
        // xlxs parsing error
        addCell(
          new ErrorCell({
            address: cellAddress,
            message: `unparseable formula or macro`,
            worksheet: this,
          }),
        );
        continue;
      }

      if (typeof cellObject.v === "undefined") {
        throw new RangeError(`${cellAddress}: value cell has undefined value`);
      }

      addCell(
        new FormulaCell({
          address: cellAddress,
          depParser: this.depParser,
          formula: cellFormula,
          value: cellObject.v!,
          worksheet: this,
        }),
      );
    }

    return cellsByAddress;
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

  cell(address: CellAddress): Maybe<Cell> {
    return Maybe.fromNullable(this.cellsByAddress.get(address.string));
  }

  @Memoize()
  toString(): string {
    return `Worksheet(name=${this.name})`;
  }
}
