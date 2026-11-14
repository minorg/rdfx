import type { PrefixMapInit } from "@rdfjs/prefix-map/PrefixMap.js";
import PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory } from "@rdfjs/types";
import { validateAbsoluteIri } from "@rdfx/curie";
import type { Logger } from "@rdfx/logger";
import { Either } from "purify-ts";
import type { Worksheet } from "./Worksheet.js";

export class PrefixMapWorksheetParser {
  private readonly dataFactory: DataFactory;
  private readonly logger: Logger;

  constructor({
    dataFactory,
    logger,
  }: { dataFactory: DataFactory; logger: Logger }) {
    this.dataFactory = dataFactory;
    this.logger = logger;
  }

  parse(worksheet: Worksheet): Either<Error, PrefixMap> {
    const prefixes: PrefixMapInit = [];

    for (const [rowI, row] of worksheet.rows.entries()) {
      const logContext = {
        worksheet: {
          name: worksheet.name,
          row: rowI,
        },
      };

      if (row.length < 2) {
        this.logger.warn(
          logContext,
          "expected row to have at least two columns, ignoring",
        );
        continue;
      }

      const prefix = row[0]?.value.extract() ?? "";
      if (typeof prefix !== "string") {
        this.logger.warn(
          logContext,
          "expected first column to be a string, ignoring",
        );
        continue;
      }

      const namespaceString =
        row[1]?.hyperlink.extract()?.target ?? row[1]?.value.extract();
      if (typeof namespaceString !== "string") {
        this.logger.warn(
          logContext,
          "expected second column to be a string or hyperlink, ignoring",
        );
        continue;
      }

      validateAbsoluteIri(namespaceString)
        .ifLeft((error) => {
          this.logger.error(
            { ...logContext, error },
            "invalid namespace: %s",
            namespaceString,
          );
        })
        .ifRight((namespaceIri) => {
          prefixes.push([prefix, this.dataFactory.namedNode(namespaceIri)]);
        });
    }

    return Either.of(new PrefixMap(prefixes, { factory: this.dataFactory }));
  }
}
