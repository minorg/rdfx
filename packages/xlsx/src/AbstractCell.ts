import type { CellAddress } from "./CellAddress.js";
import type { Worksheet } from "./Worksheet.js";

export abstract class AbstractCell {
  protected readonly worksheet: Worksheet;

  /**
   * Address of this cell.
   */
  readonly address: CellAddress;

  /**
   * SHA-256 hash hex digest of this cell.
   */
  abstract readonly hash: string;

  /**
   * Type discriminant.
   */
  abstract readonly kind: "ErrorCell" | "FormulaCell" | "ValueCell";

  constructor({
    address,
    worksheet,
  }: {
    address: CellAddress;
    worksheet: Worksheet;
  }) {
    this.address = address;
    this.worksheet = worksheet;
  }

  toJSON() {
    return {
      kind: this.kind,
      address: this.address.toJSON(),
    };
  }
}
