import type { LangString } from "./LangString.js";

export type ResourceRecord = Record<
  string,
  ResourceRecord.Value | ResourceRecord.Value[]
>;

export namespace ResourceRecord {
  export type Value = boolean | Date | LangString | number | string;
}
