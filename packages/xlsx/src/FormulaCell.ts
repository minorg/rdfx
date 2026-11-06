import { type DepParser, MAX_COLUMN, MAX_ROW } from "fast-formula-parser";
import { sha256 } from "js-sha256";
import { Either, type Maybe } from "purify-ts";
import { Memoize } from "typescript-memoize";

import { AbstractCell } from "./AbstractCell.js";
import type { Cell } from "./Cell.js";
import { CellAddress } from "./CellAddress.js";
import type { Worksheet } from "./Worksheet.js";

export class FormulaCell extends AbstractCell {
  private readonly depParser: DepParser;

  #sha256: string | null = null;

  readonly formula: string;
  override readonly kind = "FormulaCell";
  readonly value: Maybe<AbstractCell.Value>;

  constructor({
    depParser,
    formula,
    value,
    ...superParameters
  }: {
    depParser: DepParser;
    formula: string;
    value: Maybe<AbstractCell.Value>;
    worksheet: Worksheet;
  } & ConstructorParameters<typeof AbstractCell>[0]) {
    super(superParameters);
    this.depParser = depParser;
    this.formula = formula;
    this.value = value;
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
    return Either.encase(() => {
      const dependencyCellAddresses: CellAddress[] = [];

      const deps = this.depParser.parse(this.formula, {
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

  override get sha256(): string {
    if (this.#sha256 !== null) {
      return this.#sha256;
    }
    return this.hashRecursive(new Set());
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      dependencies: this.dependencyCellAddresses.mapLeft((error) => ({
        error: error.message,
      })),
      formula: this.formula,
    };
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
          if (dependency.kind === "FormulaCell") {
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
        ...super.toJSON(),
        circularDependencyCellAddresses,
        formula: this.formula,
        resolvedDependencyHashes,
        unresolvedDependencyCellAddresses,
      }),
    );

    return this.#sha256;
  }
}
