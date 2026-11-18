import type { Quad } from "@rdfjs/types";
import { namespace } from "@rdfx/iri";
import { Either, Maybe } from "purify-ts";
import { parsePrefixMapWorksheet } from "./parsePrefixMapWorksheet.js";
import type { WorkbookParser } from "./WorkbookParser.js";
import type { Worksheet } from "./Worksheet.js";
import type { WorksheetParser } from "./WorksheetParser.js";

type RdfWorksheetParser = WorksheetParser<readonly Quad[]>;

export function createRdfWorkbookParser(
  rdfWorksheetParsers:
    | ((worksheet: Worksheet) => Maybe<RdfWorksheetParser>)
    | Readonly<Record<string, RdfWorksheetParser>>,
): WorkbookParser<Quad[]> {
  const rdfWorksheetParsersFunction =
    typeof rdfWorksheetParsers === "function"
      ? rdfWorksheetParsers
      : (worksheet: Worksheet) =>
          Maybe.fromNullable(rdfWorksheetParsers[worksheet.name]);

  return (workbook, options) => {
    let { defaultNamespace, logger, prefixMap } = options;
    if (!defaultNamespace && !prefixMap) {
      const prefixMapWorksheet = workbook.worksheet("$PrefixMap").extract();
      if (prefixMapWorksheet) {
        if (rdfWorksheetParsersFunction(prefixMapWorksheet).isNothing()) {
          parsePrefixMapWorksheet(prefixMapWorksheet, options)
            .ifLeft((error) => {
              logger.error({ error }, "error parsing prefix map worksheet");
            })
            .ifRight((parsedPrefixMap) => {
              logger.debug(
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
          logger.debug(
            "ignoring prefix map worksheet in workbook because a resource parser is associated with it",
          );
        }
      } else {
        logger.debug(
          "no default namespace or prefix map supplied and no prefix map worksheet in workbook",
        );
      }
    }

    let workbookQuads: Quad[] = [];
    for (const worksheet of workbook.worksheets) {
      const rdfWorksheetParser =
        rdfWorksheetParsersFunction(worksheet).extract();
      if (rdfWorksheetParser === undefined) {
        logger.debug(
          { worksheet: { name: worksheet.name } },
          "no parser for worksheet",
        );
        continue;
      }

      const worksheetQuadsEither = rdfWorksheetParser(worksheet, {
        ...options,
        defaultNamespace,
        prefixMap,
      });
      if (worksheetQuadsEither.isLeft()) {
        return worksheetQuadsEither;
      }
      worksheetQuadsEither.ifRight((worksheetQuads) => {
        workbookQuads = workbookQuads.concat(worksheetQuads);
      });
    }
    return Either.of(workbookQuads);
  };
}
