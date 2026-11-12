import type { AbstractParser } from "./AbstractParser.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

export type ResourceRecordParserFactory = (
  parameters: ConstructorParameters<typeof AbstractParser>[0],
) => ResourceRecordParser;
