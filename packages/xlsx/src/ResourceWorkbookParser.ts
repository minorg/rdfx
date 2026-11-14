import type { NamespaceBuilder } from "@rdfjs/namespace";
import namespace from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import { Either } from "purify-ts";
import { AbstractResourceParser } from "./AbstractResourceParser.js";
import { PrefixMapWorksheetParser } from "./PrefixMapWorksheetParser.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";
import type { ResourceRecordParserFactory } from "./ResourceRecordParserFactory.js";
import { ResourceWorksheetParser } from "./ResourceWorksheetParser.js";
import type { Workbook } from "./Workbook.js";

export class ResourceWorkbookParser extends AbstractResourceParser {
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
  } & ConstructorParameters<typeof AbstractResourceParser>[0]) {
    super(superParameters);
    this.resourceRecordParsersByWorksheetName =
      resourceRecordParsersByWorksheetName;
  }

  parse(
    workbook: Workbook,
    options?: { defaultNamespace?: NamespaceBuilder; prefixMap?: PrefixMap },
  ): Either<Error, readonly Quad[]> {
    let defaultNamespace = options?.defaultNamespace;
    let prefixMap = options?.prefixMap;
    if (!defaultNamespace && !prefixMap) {
      const prefixMapWorksheet = workbook.worksheet("$PrefixMap").extract();
      if (prefixMapWorksheet) {
        if (!this.resourceRecordParsersByWorksheetName["$PrefixMap"]) {
          new PrefixMapWorksheetParser({
            dataFactory: this.dataFactory,
            logger: this.logger,
          })
            .parse(prefixMapWorksheet)
            .ifLeft((error) => {
              this.logger.error(
                { error },
                "error parsing prefix map worksheet",
              );
            })
            .ifRight((parsedPrefixMap) => {
              this.logger.debug(
                "parsed %d prefix map entries from prefix map worksheet",
                parsedPrefixMap.size,
              );
              prefixMap = parsedPrefixMap;
              const emptyPrefixNamespace = prefixMap.get("");
              if (emptyPrefixNamespace) {
                defaultNamespace = namespace(emptyPrefixNamespace.value);
              }
            });
        } else {
          this.logger.debug(
            "ignoring prefix map worksheet in workbook because a resource parser is associated with it",
          );
        }
      } else {
        this.logger.debug(
          "no default namespace or prefix map supplied and no prefix map worksheet in workbook",
        );
      }
    }

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
      }).parse(worksheet, { defaultNamespace, prefixMap });
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
