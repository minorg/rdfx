import { PrefixMap, type PrefixMapInit, validateAbsoluteIri } from "@rdfx/iri";
import { Either } from "purify-ts";
import type { WorksheetParser } from "./WorksheetParser.js";

export const parsePrefixMapWorksheet: WorksheetParser<PrefixMap> = (
  worksheet,
  { dataFactory, logger },
) => {
  const prefixes: PrefixMapInit = [];

  for (const [rowI, row] of worksheet.rows.entries()) {
    const logContext = {
      worksheet: {
        name: worksheet.name,
        row: rowI,
      },
    };

    if (row.length < 2) {
      logger.warn(
        logContext,
        "expected row to have at least two columns, ignoring",
      );
      continue;
    }

    const prefix = row.at(0)?.value.extract() ?? "";
    if (typeof prefix !== "string") {
      logger.warn(logContext, "expected first column to be a string, ignoring");
      continue;
    }

    const namespaceString =
      row.at(1)?.hyperlink.extract()?.target ?? row.at(1)?.value.extract();
    if (typeof namespaceString !== "string") {
      logger.warn(
        logContext,
        "expected second column to be a string or hyperlink, ignoring",
      );
      continue;
    }

    validateAbsoluteIri(namespaceString)
      .ifLeft((error) => {
        logger.error(
          { ...logContext, error },
          "invalid namespace: %s",
          namespaceString,
        );
      })
      .ifRight((namespaceIri) => {
        prefixes.push([prefix, dataFactory.namedNode(namespaceIri)]);
      });
  }

  return Either.of(new PrefixMap(prefixes, { factory: dataFactory }));
};
