import type { Quad } from "@rdfjs/types";
import { type Either, Left, type Maybe } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRowParser } from "./ResourceRowParser.js";
import type { Worksheet } from "./Worksheet.js";

interface ColumnMetadata {
  readonly language: Maybe<string>;
  readonly property: string;
}

export class ResourceWorksheetParser extends AbstractParser {
  private readonly resourceRowParser: ResourceRowParser;

  constructor({
    resourceRowParser,
    ...superParameters
  }: { resourceRowParser: ResourceRowParser } & ConstructorParameters<
    typeof AbstractParser
  >[0]) {
    super(superParameters);
    this.resourceRowParser = resourceRowParser;
  }

  parse(worksheet: Worksheet): Either<Error, readonly Quad[]> {
    let headerRow: readonly string[];
    const worksheetQuads: Quad[] = [];
    for (let rowI = 0; rowI < worksheet.rows.length; rowI++) {
      const row = worksheet.rows[rowI];
      if (rowI === 0) {
        const headerRowEither = this.parseHeaderRow(row);
        if (headerRowEither.isLeft()) {
          return headerRowEither;
        }
        headerRow = headerRowEither.extract()! as readonly string[];
      }
    }
  }

  private parseHeaderRow(
    row: Worksheet.Row,
  ): Either<Error, readonly ColumnMetadata[]> {
    const parsed: string[] = [];
    for (const cell of row) {
      if (cell === undefined) {
        return Left(new Error("empty cell in header row"));
      }
      if (cell.kind !== "ValueCell") {
        return Left(new Error("non-value cell in header row");
      }
    }
    return parsed;
  }
}
