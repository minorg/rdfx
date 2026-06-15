import { PropertyPath } from "./PropertyPath.js";
import type { Resource } from "./Resource.js";
import { ValueError } from "./ValueError.js";

export class MistypedValueError<T> extends ValueError {
  readonly actualValue: T;
  readonly expectedValueType: string;

  constructor({
    actualValue,
    expectedValueType,
    focusResource,
    propertyPath,
  }: {
    actualValue: T;
    expectedValueType: string;
    focusResource: Resource;
    propertyPath: PropertyPath;
  }) {
    super({
      focusResource,
      message: `expected ${focusResource.identifier} ${PropertyPath.toString(propertyPath)} to be a ${expectedValueType}, was ${actualValue}`,
      propertyPath,
    });
    this.actualValue = actualValue;
    this.expectedValueType = expectedValueType;
  }
}
