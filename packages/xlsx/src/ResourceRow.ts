import type { Literal } from "@rdfjs/types";

export type ResourceRow = Record<string, ResourceRow.Cell>;

export namespace ResourceRow {
  export type Cell = boolean | Date | Literal | number | string;
}
