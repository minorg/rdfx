import type { Quad } from "@rdfjs/types";
import { Either, Left, Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { AbstractParser } from "./AbstractParser.js";
import { Cell } from "./Cell.js";
import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";
import type { ResourceRecordParserFactory } from "./ResourceRecordParserFactory.js";
import type { Worksheet } from "./Worksheet.js";

interface ColumnMetadata {
  readonly language: Maybe<string>;
  readonly property: string;
}

export class ResourceWorksheetParser extends AbstractParser {
  private readonly resourceRecordParser:
    | ResourceRecordParser
    | ResourceRecordParserFactory;

  constructor({
    resourceRecordParser,
    ...superParameters
  }: {
    resourceRecordParser: ResourceRecordParser | ResourceRecordParserFactory;
  } & ConstructorParameters<typeof AbstractParser>[0]) {
    super(superParameters);
    this.resourceRecordParser = resourceRecordParser;
  }

  parse(worksheet: Worksheet): Either<Error, readonly Quad[]> {
    let headerRow: readonly ColumnMetadata[] | undefined;
    const resourceRecordParser: ResourceRecordParser =
      typeof this.resourceRecordParser === "function"
        ? this.resourceRecordParser({
            dataFactory: this.dataFactory,
            datasetFactory: this.datasetFactory,
            defaultNamespace: this.defaultNamespace.extract(),
            logger: this.logger,
            prefixMap: this.prefixMap.extract(),
          })
        : this.resourceRecordParser;
    let worksheetQuads: Quad[] = [];
    for (
      let worksheetRowI = 0;
      worksheetRowI < worksheet.rows.length;
      worksheetRowI++
    ) {
      const worksheetRow = worksheet.rows[worksheetRowI];
      if (worksheetRowI === 0) {
        const headerRowEither = this.parseHeaderRow(worksheetRow);
        if (headerRowEither.isLeft()) {
          return headerRowEither.mapLeft(
            (error) => new Error(`${worksheet.name}: ${error.message}`),
          );
        }
        headerRow = headerRowEither.extract()! as readonly ColumnMetadata[];
        continue;
      }

      invariant(headerRow);
      const resourceRecord: ResourceRecord = {};
      for (
        let worksheetColumnI = 0;
        worksheetColumnI < worksheetRow.length;
        worksheetColumnI++
      ) {
        const logContext = {
          worksheet: {
            column: worksheetColumnI,
            name: worksheet.name,
            row: worksheetRowI,
          },
        };

        if (worksheetColumnI >= headerRow.length) {
          this.logger.warn(logContext, "more columns than header row");
          continue;
        }
        const columnMetadata = headerRow[worksheetColumnI];

        const worksheetCell = worksheetRow[worksheetColumnI];
        if (worksheetCell === undefined) {
          this.logger.debug(logContext, "undefined cell");
          continue;
        }

        let newValue: ResourceRecord.Value;
        if (worksheetCell.hyperlink.isJust()) {
          newValue = worksheetCell.hyperlink.extract()!.target;
        } else {
          const worksheetCellValue = worksheetCell.value.extract();
          if (worksheetCellValue === undefined) {
            this.logger.debug(logContext, "cell without value");
            continue;
          }
          if (worksheetCellValue instanceof Cell.Error) {
            this.logger.debug(logContext, "error cell");
            continue;
          }
          newValue = worksheetCellValue;
        }

        if (columnMetadata.language.isJust()) {
          newValue = {
            language: columnMetadata.language.extract()!,
            value:
              newValue instanceof Date
                ? newValue.toISOString()
                : newValue.toString(),
          };
        }

        const existingValue = resourceRecord[columnMetadata.property];
        if (existingValue === undefined) {
          resourceRecord[columnMetadata.property] = newValue;
        } else if (Array.isArray(existingValue)) {
          existingValue.push(newValue);
        } else {
          resourceRecord[columnMetadata.property] = [existingValue, newValue];
        }

        const rowQuadsEither = resourceRecordParser.parse(resourceRecord);
        if (rowQuadsEither.isLeft()) {
          return rowQuadsEither;
        }
        rowQuadsEither.ifRight((rowQuads) => {
          worksheetQuads = worksheetQuads.concat(rowQuads);
        });
      }
    }
    return Either.of(worksheetQuads);
  }

  private parseHeaderRow(
    row: Worksheet.Row,
  ): Either<Error, readonly ColumnMetadata[]> {
    const parsed: ColumnMetadata[] = [];
    for (const cell of row) {
      if (cell === undefined) {
        return Left(new Error("empty cell in header row"));
      }
      const cellValue = cell.value.extract();
      if (cellValue === undefined) {
        return Left(new Error("cell without value in header row"));
      }
      if (typeof cellValue !== "string") {
        return Left(new Error("non-string cell value in header row"));
      }
      let [property, language] = cellValue.split("@", 2);
      property = property.trim();
      if (property.length === 0) {
        return Left(new Error("empty/blank cell value in header row"));
      }
      if (language) {
        language = language.trim();
        if (language.length === 0) {
          return Left(new Error(`empty language in header row: ${cell.value}`));
        }
      }
      parsed.push({
        language: Maybe.fromNullable(language),
        property,
      });
    }
    return Either.of(parsed);
  }
}
