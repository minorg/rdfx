import { type DepParser, MAX_COLUMN, MAX_ROW } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Either, type Maybe } from "purify-ts";
import { Memoize } from "typescript-memoize";

import { CellAddress } from "./CellAddress.js";
import type { Worksheet } from "./Worksheet.js";

export class Cell {
  private readonly depParser: DepParser;
  private readonly worksheet: Worksheet;

  #sha256: string | null = null;

  /**
   * Address of this cell.
   */
  readonly address: CellAddress;

  /**
   * Formula associated with this cell.
   */
  readonly formula: Maybe<string>;

  /**
   * Hyperlink attached to this cell.
   */
  readonly hyperlink: Maybe<Cell.Hyperlink>;

  /**
   * Value associated with this cell.
   */
  readonly value: Maybe<Cell.Value>;

  constructor({
    address,
    depParser,
    formula,
    hyperlink,
    value,
    worksheet,
  }: {
    address: CellAddress;
    depParser: DepParser;
    formula: Maybe<string>;
    hyperlink: Maybe<Cell.Hyperlink>;
    value: Maybe<Cell.Value>;
    worksheet: Worksheet;
  }) {
    this.address = address;
    this.depParser = depParser;
    this.formula = formula;
    this.hyperlink = hyperlink;
    this.value = value;
    this.worksheet = worksheet;
  }

  @Memoize()
  get dependencies(): Either<Error, (CellAddress | Cell)[]> {
    return this.dependencyCellAddresses.map((dependencyCellAddresses) =>
      dependencyCellAddresses.map((dependencyCellAddress) =>
        (
          this.worksheet.workbook.cell(dependencyCellAddress) as Maybe<
            CellAddress | Cell
          >
        ).orDefault(dependencyCellAddress),
      ),
    );
  }

  @Memoize()
  get dependencyCellAddresses(): Either<Error, readonly CellAddress[]> {
    const formula = this.formula.extract();
    if (!formula) {
      return Either.of([]);
    }

    return Either.encase(() => {
      const dependencyCellAddresses: CellAddress[] = [];

      const deps = this.depParser.parse(formula, {
        // DepParser uses 1-based row and column indices
        col: this.address.columnIndex + 1,
        row: this.address.rowIndex + 1,
        sheet: this.worksheet.name,
      });

      for (const dep of deps) {
        if ("from" in dep) {
          for (
            let row = Math.min(dep.from.row, dep.to.row);
            row <= Math.max(dep.from.row, dep.to.row);
            row++
          ) {
            for (
              let col = Math.min(dep.from.col, dep.to.col);
              col <= Math.max(dep.from.col, dep.to.col);
              col++
            ) {
              dependencyCellAddresses.push(
                new CellAddress({
                  columnIndex: col - 1,
                  rowIndex: row - 1,
                  worksheetName: dep.sheet ?? this.worksheet.name,
                }),
              );
            }
          }
        } else {
          if (dep.col === MAX_COLUMN || dep.row === MAX_ROW) {
            continue;
          }

          dependencyCellAddresses.push(
            new CellAddress({
              columnIndex: dep.col - 1,
              rowIndex: dep.row - 1,
              worksheetName: dep.sheet ?? this.worksheet.name,
            }),
          );
        }
      }

      return dependencyCellAddresses;
    });
  }

  /**
   * SHA-256 sha256 hex digest of this cell.
   */
  get sha256(): string {
    if (this.#sha256 !== null) {
      return this.#sha256;
    }

    return this.hashRecursive(new Set());
  }

  toJSON() {
    const json: Record<string, unknown> = {};

    this.dependencyCellAddresses
      .ifLeft((error) => {
        json["dependencies"] = { error: error.message };
      })
      .ifRight((dependencies) => {
        json["dependencies"] = dependencies;
      });

    this.formula.ifJust((formula) => {
      json["formula"] = formula;
    });

    this.hyperlink.ifJust((hyperlink) => {
      json["hyperlink"] = Cell.Hyperlink.toJSON(hyperlink);
    });

    this.value.ifJust((value) => {
      json["value"] = Cell.Value.toJSON(value);
    });

    return json;
  }

  protected hashRecursive(visitedCellAddresses: Set<string>): string {
    if (this.#sha256 !== null) {
      return this.#sha256;
    }

    visitedCellAddresses.add(this.address.string);

    const circularDependencyCellAddresses: string[] = [];
    const resolvedDependencyHashes: string[] = [];
    const unresolvedDependencyCellAddresses: string[] = [];

    for (const dependencyCellAddress of this.dependencyCellAddresses.orDefault(
      [],
    )) {
      if (visitedCellAddresses.has(dependencyCellAddress.string)) {
        circularDependencyCellAddresses.push(dependencyCellAddress.string);
        continue;
      }

      this.worksheet.workbook
        .cell(dependencyCellAddress)
        .ifJust((dependency) => {
          if (dependency.formula.isJust()) {
            resolvedDependencyHashes.push(
              dependency.hashRecursive(visitedCellAddresses),
            );
          } else {
            resolvedDependencyHashes.push(dependency.sha256);
          }
        })
        .ifNothing(() => {
          unresolvedDependencyCellAddresses.push(dependencyCellAddress.string);
        });
    }

    visitedCellAddresses.delete(this.address.string);

    this.#sha256 = sha256(
      JSON.stringify({
        address: this.address.toJSON(),
        circularDependencyCellAddresses:
          circularDependencyCellAddresses.length > 0
            ? circularDependencyCellAddresses
            : undefined,
        formula: this.formula.extract(),
        hyperlink: this.hyperlink.map(Cell.Hyperlink.toJSON).extract(),
        resolvedDependencyHashes:
          resolvedDependencyHashes.length > 0
            ? resolvedDependencyHashes
            : undefined,
        unresolvedDependencyCellAddresses:
          unresolvedDependencyCellAddresses.length > 0
            ? unresolvedDependencyCellAddresses
            : undefined,
        value: this.value.map(Cell.Value.toJSON).extract(),
      }),
    );

    return this.#sha256;
  }
}

export namespace Cell {
  // biome-ignore lint/suspicious/noShadowRestrictedNames: Only used here
  export class Error {
    constructor(readonly value: string) {}
  }

  export interface Hyperlink {
    readonly target: string;
    readonly tooltip: Maybe<string>;
  }

  export namespace Hyperlink {
    export function toJSON(hyperlink: Hyperlink): {
      target: string;
      tooltip?: string;
    } {
      return { target: hyperlink.target, tooltip: hyperlink.tooltip.extract() };
    }
  }

  export type Value = boolean | Error | Date | number | string;

  export namespace Value {
    export function toJSON(
      value: Value,
    ): boolean | number | { error: string } | string {
      switch (typeof value) {
        case "boolean":
        case "number":
        case "string":
          return value;
        case "object":
          if (value instanceof Date) {
            return value.toISOString();
          } else if (value instanceof Cell.Error) {
            return {
              error: value.value,
            };
          } else {
            value satisfies never;
            throw new RangeError();
          }
        default:
          value satisfies never;
          throw new RangeError(typeof value);
      }
    }
  }
}
