import type { Maybe } from "purify-ts";

import type { CellAddress } from "./CellAddress.js";
import type { Worksheet } from "./Worksheet.js";

export abstract class AbstractCell {
  protected readonly worksheet: Worksheet;

  /**
   * Address of this cell.
   */
  readonly address: CellAddress;

  /**
   * Hyperlink attached to this cell.
   */
  readonly hyperlink: Maybe<AbstractCell.Hyperlink>;

  /**
   * Type discriminant.
   */
  abstract readonly kind: "Error" | "Formula" | "Value";

  /**
   * SHA-256 sha256 hex digest of this cell.
   */
  abstract readonly sha256: string;

  constructor({
    address,
    hyperlink,
    worksheet,
  }: {
    address: CellAddress;
    hyperlink: Maybe<AbstractCell.Hyperlink>;
    worksheet: Worksheet;
  }) {
    this.address = address;
    this.hyperlink = hyperlink;
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
  export interface Hyperlink {
    readonly target: string;
    readonly tooltip: Maybe<string>;
  }

  export type Value = boolean | Date | number | string;
}
