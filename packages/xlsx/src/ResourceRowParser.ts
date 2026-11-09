import type { Quad } from "@rdfjs/types";
import type { Either } from "purify-ts";
import { AbstractParser } from "./AbstractParser.js";
import type { ResourceRow } from "./ResourceRow.js";

export abstract class ResourceRowParser extends AbstractParser {
  abstract parse(resourceRow: ResourceRow): Either<Error, readonly Quad[]>;
}
