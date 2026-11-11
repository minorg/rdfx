import type { Quad } from "@rdfjs/types";
import { Either } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";
import type { ResourceRecordParserFactory } from "./ResourceRecordParserFactory.js";
import { ResourceWorksheetParser } from "./ResourceWorksheetParser.js";
import type { Workbook } from "./Workbook.js";

export class ResourceWorkbookParser extends AbstractParser {
  private readonly resourceRecordParsersByWorksheetName: Readonly<
    Record<string, ResourceRecordParser | ResourceRecordParserFactory>
  >;

  constructor({
    resourceRecordParsersByWorksheetName,
    ...superParameters
  }: {
    resourceRecordParsersByWorksheetName: Readonly<
      Record<string, ResourceRecordParser | ResourceRecordParserFactory>
    >;
  } & ConstructorParameters<typeof AbstractParser>[0]) {
    super(superParameters);
    this.resourceRecordParsersByWorksheetName =
      resourceRecordParsersByWorksheetName;
  }

  parse(workbook: Workbook): Either<Error, readonly Quad[]> {
    let workbookQuads: Quad[] = [];
    for (const worksheet of workbook.worksheets) {
      const resourceRecordParser =
        this.resourceRecordParsersByWorksheetName[worksheet.name];
      if (resourceRecordParser === undefined) {
        this.logger.debug(
          { worksheet: { name: worksheet.name } },
          "no resource row parser for worksheet",
        );
        continue;
      }

      const worksheetDatasetEither = new ResourceWorksheetParser({
        dataFactory: this.dataFactory,
        datasetFactory: this.datasetFactory,
        logger: this.logger,
        resourceRecordParser,
      }).parse(worksheet);
      if (worksheetDatasetEither.isLeft()) {
        return worksheetDatasetEither;
      }
      worksheetDatasetEither.ifRight((worksheetQuads) => {
        workbookQuads = workbookQuads.concat(worksheetQuads);
      });
    }
    return Either.of(workbookQuads);
  }
}
