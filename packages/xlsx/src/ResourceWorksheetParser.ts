import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import { Either, Left, Maybe } from "purify-ts";
import { invariant } from "ts-invariant";
import { AbstractResourceParser } from "./AbstractResourceParser.js";
import { Cell } from "./Cell.js";
import { LangString } from "./LangString.js";
import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";
import type { ResourceRecordParserFactory } from "./ResourceRecordParserFactory.js";
import type { Worksheet } from "./Worksheet.js";

interface ColumnMetadata {
  readonly language: Maybe<string>;
  readonly property: string;
}

export class ResourceWorksheetParser extends AbstractResourceParser {
  private readonly resourceRecordParser:
    | ResourceRecordParser
    | ResourceRecordParserFactory;

  constructor({
    resourceRecordParser,
    ...superParameters
  }: {
    resourceRecordParser: ResourceRecordParser | ResourceRecordParserFactory;
  } & ConstructorParameters<typeof AbstractResourceParser>[0]) {
    super(superParameters);
    this.resourceRecordParser = resourceRecordParser;
  }

  parse(
    worksheet: Worksheet,
    options?: { defaultNamespace?: NamespaceBuilder; prefixMap?: PrefixMap },
  ): Either<Error, readonly Quad[]> {
    let headerRow: readonly ColumnMetadata[] | undefined;
    const resourceRecordParser: ResourceRecordParser =
      typeof this.resourceRecordParser === "function"
        ? this.resourceRecordParser({
            dataFactory: this.dataFactory,
            datasetFactory: this.datasetFactory,
            logger: this.logger,
          })
        : this.resourceRecordParser;
    let worksheetQuads: Quad[] = [];
    for (const [worksheetRowI, worksheetRow] of worksheet.rows.entries()) {
      if (worksheetRowI === 0) {
        const headerRowEither = this.parseHeaderRow(worksheet, worksheetRow);
        if (headerRowEither.isLeft()) {
          return headerRowEither.mapLeft(
            (error) => new Error(`${worksheet.name}: ${error.message}`),
          );
        }
        headerRow = headerRowEither.extract()! as readonly ColumnMetadata[];
        continue;
      }

      invariant(headerRow);

      const worksheetRowQuadsEither = this.parseResourceRow({
        headerRow,
        worksheet,
        worksheetRow,
        worksheetRowI,
      }).chain((resourceRecord) =>
        resourceRecordParser.parse(resourceRecord, options),
      );
      if (worksheetRowQuadsEither.isLeft()) {
        return worksheetRowQuadsEither;
      }
      worksheetRowQuadsEither.ifRight((worksheetRowQuads) => {
        worksheetQuads = worksheetQuads.concat(worksheetRowQuads);
      });
    }
    return Either.of(worksheetQuads);
  }

  private parseHeaderRow(
    worksheet: Worksheet,
    worksheetRow: Worksheet.Row,
  ): Either<Error, readonly ColumnMetadata[]> {
    const headerRow: ColumnMetadata[] = [];
    for (const [columnI, cell] of worksheetRow.entries()) {
      if (cell === undefined) {
        return Left(
          new Error(
            `worksheet ${worksheet.name} header row column ${columnI} is empty`,
          ),
        );
      }

      const cellValue = cell.value.extract();
      if (cellValue === undefined) {
        return Left(new Error(`header cell ${cell.address} has no value`));
      }

      if (typeof cellValue !== "string") {
        return Left(
          new Error(`header cell ${cell.address} has non-string value`),
        );
      }

      let property: string;
      let language: string | undefined;
      if (cellValue.startsWith("@")) {
        property = cellValue;
      } else {
        [property, language] = cellValue.split("@", 2);
      }

      property = property.trim();
      if (property.length === 0) {
        return Left(
          new Error(
            `header cell ${cell.address} doesn't specify a property: ${cellValue}`,
          ),
        );
      }

      if (language) {
        language = language.trim();
        if (language.length === 0) {
          return Left(
            new Error(
              `empty language in header cell ${cell.address}: ${cellValue}`,
            ),
          );
        }
      }
      headerRow.push({
        language: Maybe.fromNullable(language),
        property,
      });
    }
    return Either.of(headerRow);
  }

  private parseResourceRow({
    headerRow,
    worksheet,
    worksheetRow,
    worksheetRowI,
  }: {
    headerRow: readonly ColumnMetadata[];
    worksheet: Worksheet;
    worksheetRow: Worksheet.Row;
    worksheetRowI: number;
  }): Either<Error, ResourceRecord> {
    const resourceRecord: ResourceRecord = {};
    for (const [worksheetColumnI, worksheetCell] of worksheetRow.entries()) {
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
        newValue = new LangString({
          language: columnMetadata.language.extract()!,
          value:
            newValue instanceof Date
              ? newValue.toISOString()
              : newValue.toString(),
        });
      }

      const existingValue = resourceRecord[columnMetadata.property];
      if (existingValue === undefined) {
        resourceRecord[columnMetadata.property] = newValue;
      } else if (Array.isArray(existingValue)) {
        existingValue.push(newValue);
      } else {
        resourceRecord[columnMetadata.property] = [existingValue, newValue];
      }
    }

    return Either.of(resourceRecord);
  }
}
