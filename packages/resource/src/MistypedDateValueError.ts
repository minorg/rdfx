import { MistypedValueError } from "./MistypedValueError.js";
import { PropertyPath } from "./PropertyPath.js";
import type { Resource } from "./Resource.js";

export class MistypedDateValueError extends MistypedValueError<Date> {
  constructor({
    actualValue,
    expectedValueType,
    focusResource,
    propertyPath,
  }: {
    actualValue: Date;
    expectedValueType: string;
    focusResource: Resource;
    propertyPath: PropertyPath;
  }) {
    super({
      actualValue,
      expectedValueType,
      focusResource,
      message: `expected ${focusResource.identifier} ${PropertyPath.toString(propertyPath)} to be a ${expectedValueType}, was ${typeof actualValue}`,
      propertyPath,
    });
  }
}
