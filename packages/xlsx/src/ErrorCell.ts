import { sha256 } from "js-sha256";
import { Memoize } from "typescript-memoize";

import { AbstractCell } from "./AbstractCell.js";

export class ErrorCell extends AbstractCell {
  readonly kind = "ErrorCell";
  readonly message: string;

  constructor({
    message,
    ...superParameters
  }: { message: string } & ConstructorParameters<typeof AbstractCell>[0]) {
    super(superParameters);
    this.message = message;
  }

  @Memoize()
  get sha256(): string {
    return sha256(JSON.stringify(this.toJSON()));
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      message: this.message,
    };
  }
}
