import type { Quad } from "@rdfjs/types";
import { Either } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRowParser } from "./ResourceRowParser.js";
import { ResourceWorksheetParser } from "./ResourceWorksheetParser.js";
import type { Workbook } from "./Workbook.js";

export class ResourceWorkbookParser extends AbstractParser {
  private readonly resourceRowParsersByWorksheetName: Readonly<
    Record<string, ResourceRowParser>
  >;

  constructor({
    resourceRowParsersByWorksheetName,
    ...superParameters
  }: {
    resourceRowParsersByWorksheetName: Readonly<
      Record<string, ResourceRowParser>
    >;
  } & ConstructorParameters<typeof AbstractParser>[0]) {
    super(superParameters);
    this.resourceRowParsersByWorksheetName = resourceRowParsersByWorksheetName;
  }

  parse(workbook: Workbook): Either<Error, readonly Quad[]> {
    let workbookQuads: Quad[] = [];
    for (const worksheet of workbook.worksheets) {
      const resourceRowParser =
        this.resourceRowParsersByWorksheetName[worksheet.name];
      if (resourceRowParser === undefined) {
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
        resourceRowParser,
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
