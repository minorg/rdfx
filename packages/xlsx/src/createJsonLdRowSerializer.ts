import { invariant } from "ts-invariant";
import { appendRecordValue } from "./appendRecordValue.js";
import type { Cell } from "./Cell.js";
import type { Worksheet } from "./Worksheet.js";

interface IntermediateObjectFunctions<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
> {
  toJson: (object: IntermediateObjectT) => JsonObjectT;
}

const DATE_ISO_STRING_REGEX =
  /^(?:\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|02-(?:0[1-9]|1\d|2[0-8]))|(?:\d\d(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29)(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z)?$/;

export function createJsonLdRowSerializer<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
>(
  intermediateObjectFunctions: IntermediateObjectFunctions<
    IntermediateObjectT,
    JsonObjectT
  >,
): (object: IntermediateObjectT) => Worksheet.Builder.Row {
  return (object) => {
    const jsonLdObject = intermediateObjectFunctions.toJson(object);
    const row: Record<string, Cell.Value | Cell.Value[]> = {};
    for (const [key, valueOrValues] of Object.entries(jsonLdObject)) {
      if (key.startsWith("@")) {
        invariant(typeof valueOrValues === "string", typeof valueOrValues);
        appendRecordValue(row, key, valueOrValues);
        continue;
      }

      const values: unknown[] = Array.isArray(valueOrValues)
        ? valueOrValues
        : [valueOrValues];
      for (const value of values) {
        if (value == null) {
          continue;
        }

        switch (typeof value) {
          case "boolean":
          case "number":
            appendRecordValue(row, key, value);
            break;
          case "object": {
            if (
              "@language" in value &&
              typeof value["@language"] === "string" &&
              "@value" in value &&
              typeof value["@value"] === "string"
            ) {
              // rdf:langString
              appendRecordValue(
                row,
                `${key}@${value["@language"]}`,
                value["@value"],
              );
            } else if (
              "@id" in value &&
              typeof value["@id"] === "string" &&
              Object.keys(value).length === 1
            ) {
              appendRecordValue(row, key, value["@id"]);
            } else {
              throw new RangeError(
                `unsupported object type: ${JSON.stringify(value)}`,
              );
            }
            break;
          }
          case "string": {
            if (DATE_ISO_STRING_REGEX.test(value)) {
              // If the string exactly matches the format of Date.toISOString() or Date.toISOString().slice(0, 10) (date only)
              // then convert it to a Date.
              appendRecordValue(row, key, new Date(value));
            } else {
              appendRecordValue(row, key, value);
            }
            break;
          }
          default:
            throw new RangeError(`unsupported value type: ${typeof value}`);
        }
      }
    }

    return row;
  };
}
