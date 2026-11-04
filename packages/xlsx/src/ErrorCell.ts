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

  override toJSON() {
    return {
      ...super.toJSON(),
      message: this.message,
    };
  }
}
