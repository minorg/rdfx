import { invariant } from "ts-invariant";
import { appendRecordValue } from "./appendRecordValue.js";
import type { Cell } from "./Cell.js";
import type { Worksheet } from "./Worksheet.js";

type ShaclmateItemType =
  | "BigDecimal"
  | "BigInt"
  | "Boolean"
  | "Date"
  | "DateTime"
  | "Float"
  | "Identifier"
  | "Int"
  | "Iri"
  | "LangString"
  | "Lazy"
  | "String";

interface IntermediateObjectFunctions<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
> {
  schema: {
    kind: "Object";
    properties: Record<
      string,
      {
        type:
          | {
              kind: ShaclmateItemType;
            }
          | {
              itemType: { kind: ShaclmateItemType };
              kind: "List" | "Set";
            };
      }
    >;
  };

  toJson: (object: IntermediateObjectT) => JsonObjectT;
}

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

        let valueType: ShaclmateItemType | undefined;
        const propertySchema =
          intermediateObjectFunctions.schema.properties[key];
        if (propertySchema) {
          switch (propertySchema.type.kind) {
            case "List":
            case "Set":
              valueType = propertySchema.type.itemType.kind;
              break;
            default:
              valueType = propertySchema.type.kind;
              break;
          }
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
            if (valueType) {
              switch (valueType) {
                case "Date":
                case "DateTime":
                  appendRecordValue(row, key, new Date(value));
                  break;
                default:
                  appendRecordValue(row, key, value);
                  break;
              }
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
