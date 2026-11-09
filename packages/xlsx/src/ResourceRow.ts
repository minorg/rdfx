export type ResourceRow = Record<string, ResourceRow.Cell>;

export namespace ResourceRow {
  type LangString = { readonly language: string; readonly value: string };

  export type Cell = boolean | Date | LangString | number | string;
}
