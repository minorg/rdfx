import type { Quad } from "@rdfjs/types";
import { Either } from "purify-ts";
import type { RowParser } from "./RowParser.js";
import type { WorksheetParser } from "./WorksheetParser.js";

export function createRdfWorksheetParser(
  rdfRowParser: RowParser<readonly Quad[]>,
): WorksheetParser<readonly Quad[]> {
  return (worksheet, options) => {
    let worksheetQuads: Quad[] = [];
    for (const row of worksheet.dataRows) {
      const rowQuadsEither = rdfRowParser(row, options);
      if (rowQuadsEither.isLeft()) {
        return rowQuadsEither;
      }
      rowQuadsEither.ifRight((worksheetRowQuads) => {
        worksheetQuads = worksheetQuads.concat(worksheetRowQuads);
      });
    }
    return Either.of(worksheetQuads);
  };
}
