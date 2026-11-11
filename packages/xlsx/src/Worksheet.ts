import type { Logger } from "@rdfx/logger";
import type { DepParser } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Memoize } from "typescript-memoize";
import * as xlsx from "xlsx";
import { Cell } from "./Cell.js";
import { CellAddress } from "./CellAddress.js";
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
   * Dense array of rows with undefined's for empty cells.
   *
   * Includes any row that has a populated cell (i.e., within the !ref range of the worksheet).
   */
  @Memoize()
  get rows(): readonly Worksheet.Row[] {
    const worksheetRange = xlsx.utils.decode_range(
      this.delegate["!ref"] || "A1",
    );
    const rows: Worksheet.Row[] = [];
    for (let r = worksheetRange.s.r; r <= worksheetRange.e.r; ++r) {
      const row: (Cell | undefined)[] = [];
      for (let c = worksheetRange.s.c; c <= worksheetRange.e.c; ++c) {
        row.push(
          this.cellsByAddress.get(
            CellAddress.parse(xlsx.utils.encode_cell({ c, r }), this.name)
              .string,
          ),
        );
      }
      rows.push(row);
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
  export type Row = readonly (Cell | undefined)[];
}
