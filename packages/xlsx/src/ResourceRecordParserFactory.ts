import type { AbstractResourceParser } from "./AbstractResourceParser.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

export type ResourceRecordParserFactory = (
  parameters: ConstructorParameters<typeof AbstractResourceParser>[0],
) => ResourceRecordParser;
