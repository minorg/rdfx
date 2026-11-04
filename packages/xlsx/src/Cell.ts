import type { ErrorCell } from "./ErrorCell.js";
import type { FormulaCell } from "./FormulaCell.js";
import type { ValueCell } from "./ValueCell.js";

export type Cell = ErrorCell | FormulaCell | ValueCell;
