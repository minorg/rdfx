import type { CellAddress } from "./CellAddress.js";
import type { Worksheet } from "./Worksheet.js";

export abstract class AbstractCell {
  protected readonly worksheet: Worksheet;

  /**
   * Address of this cell.
   */
  readonly address: CellAddress;

  /**
   * Type discriminant.
   */
  abstract readonly kind: "ErrorCell" | "FormulaCell" | "ValueCell";

  /**
   * SHA-256 sha256 hex digest of this cell.
   */
  abstract readonly sha256: string;

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

export namespace AbstractCell {
  export type Value = boolean | Date | number | string;
}
