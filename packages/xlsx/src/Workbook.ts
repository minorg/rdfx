import { type Logger, nopLogger } from "@rdfx/logger";
import { DepParser } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Either, Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { Memoize } from "typescript-memoize";
import * as xlsx from "xlsx";
import type { Cell } from "./Cell.js";
import type { CellAddress } from "./CellAddress.js";
import { Worksheet } from "./Worksheet.js";

export class Workbook {
  private readonly delegate: xlsx.WorkBook;
  private readonly depParser = new DepParser();
  private readonly logger: Logger;

  private constructor({
    delegate,
    logger,
  }: { delegate: xlsx.WorkBook; logger: Logger }) {
    this.delegate = delegate;
    this.logger = logger;
  }

  @Memoize()
  get cells(): readonly Cell[] {
    return [...this.cellsByAddress.values()];
  }

  @Memoize()
  get cellsByAddress(): ReadonlyMap<string, Cell> {
    const cellsByAddress = new Map<string, Cell>();
    for (const worksheet of this.worksheets) {
      for (const cell of worksheet.cells) {
        invariant(
          !cellsByAddress.has(cell.address.string),
          cell.address.string,
        );
        cellsByAddress.set(cell.address.string, cell);
      }
    }
    return cellsByAddress;
  }

  /**
   * SHA-256 sha256 hex digest of this workbook.
   */
  @Memoize()
  get sha256(): string {
    const hasher = sha256.create();
    for (const worksheet of this.worksheets) {
      hasher.update(worksheet.sha256);
    }
    return hasher.hex();
  }

  @Memoize()
  get worksheets(): readonly Worksheet[] {
    return Object.entries(this.delegate.Sheets).map(
      ([name, worksheet], index) =>
        new Worksheet({
          definedNames: this.delegate.Workbook?.Names ?? [],
          delegate: worksheet,
          depParser: this.depParser,
          hidden: (this.delegate.Workbook?.Sheets?.[index]?.Hidden ?? 0) !== 0,
          index,
          logger: this.logger,
          name,
          workbook: this,
        }),
    );
  }

  static read(
    data: Uint8Array,
    options?: { logger?: Logger },
  ): Either<Error, Workbook> {
    return Either.encase(() => {
      return new Workbook({
        delegate: xlsx.read(data, {
          cellFormula: true,
          cellNF: false,
          cellDates: false,
          WTF: false,
        }),
        logger: options?.logger ?? nopLogger,
      });
    });
  }

  cell(address: CellAddress): Maybe<Cell> {
    return Maybe.fromNullable(this.cellsByAddress.get(address.string));
  }
}
