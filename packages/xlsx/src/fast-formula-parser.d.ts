declare module "fast-formula-parser" {
  export interface Position {
    sheet: string;
    row: number;
    col: number;
  }

  export type CellRef =
    | {
        sheet?: string;
        row: number;
        col: number;
      }
    | {
        sheet?: string;
        from: Position;
        to: Position;
      };

  export class DepParser {
    constructor(options?: {
      onVariable?: (name: string) => CellRef | null;
    });

    parse(formula: string, position: Position): CellRef[];
  }

  export const MAX_ROW: number;
  export const MAX_COLUMN: number;
}
