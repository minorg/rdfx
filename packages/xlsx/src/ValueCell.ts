import { sha256 } from "js-sha256";
import { Memoize } from "typescript-memoize";
import { AbstractCell } from "./AbstractCell.js";

export class ValueCell extends AbstractCell {
  readonly kind = "ValueCell";
  readonly value: boolean | Date | number | string;

  constructor({
    value,
    ...superParameters
  }: {
    value: boolean | Date | number | string;
  } & ConstructorParameters<typeof AbstractCell>[0]) {
    super(superParameters);
    this.value = value;
  }

  @Memoize()
  get hash(): string {
    return sha256(JSON.stringify(this.toJSON()));
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      value:
        typeof this.value === "object" ? this.value.toISOString() : this.value,
    };
  }
}
