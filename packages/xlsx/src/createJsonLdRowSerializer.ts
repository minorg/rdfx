import type { DataFactory } from "@rdfjs/types";
import { LiteralDecoder, literalDatatypeDefinitions } from "@rdfx/literal";
import type { Logger } from "@rdfx/logger";
import { flatten } from "flat";
import type { Either } from "purify-ts";
import { z } from "zod";
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

const jsonLdValueObjectSchema = z
  .object({
    "@language": z.string().min(1).optional(),
    "@type": z.string().min(1).optional(),
    "@value": z.string().min(1),
  })
  .strict();

const jsonLdNodeObjectSchema = z
  .object({
    "@id": z.string().min(1),
  })
  .strict();

export function createJsonLdRowSerializer<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
>(
  intermediateObjectFunctions: IntermediateObjectFunctions<
    IntermediateObjectT,
    JsonObjectT
  >,
): (
  object: IntermediateObjectT,
  parameters: { dataFactory: DataFactory; logger: Logger },
) => Worksheet.Builder.Row {
  return (object, { dataFactory, logger }) => {
    const jsonLdObject = intermediateObjectFunctions.toJson(object);

    /**
     * Recursively convert JSON-LD to cell values, preserving arrays and objects.
     */
    function convertJsonLdTypesToXlsxTypes(
      jsonLd: unknown,
    ): boolean | number | object | null | string | undefined {
      if (jsonLd == null) {
        return jsonLd;
      }

      switch (typeof jsonLd) {
        case "boolean":
        case "number":
          return jsonLd;
        case "object": {
          if (Array.isArray(jsonLd)) {
            return jsonLd.map(convertJsonLdTypesToXlsxTypes);
          }

          const jsonLdValueObject =
            jsonLdValueObjectSchema.safeParse(jsonLd)?.data;
          if (jsonLdValueObject) {
            if (jsonLdValueObject["@language"]) {
              // rdf:langString
              return jsonLd;
            }

            if (jsonLdValueObject["@type"]) {
              const literalDatatypeDefinition =
                literalDatatypeDefinitions[jsonLdValueObject["@type"]];
              if (literalDatatypeDefinition) {
                const literal = dataFactory.literal(
                  jsonLdValueObject["@value"],
                  dataFactory.namedNode(jsonLdValueObject["@type"]),
                );

                let decodedLiteralEither: Either<
                  Error,
                  boolean | Date | string | number
                >;
                switch (literalDatatypeDefinition.kind) {
                  case "bigdecimal":
                    decodedLiteralEither =
                      LiteralDecoder.decodeBigDecimalLiteral(literal).map((_) =>
                        _.toFixed(),
                      );
                    break;
                  case "bigint":
                    decodedLiteralEither = LiteralDecoder.decodeBigIntLiteral(
                      literal,
                    ).map((_) => _.toString());
                    break;
                  case "boolean":
                    decodedLiteralEither =
                      LiteralDecoder.decodeBooleanLiteral(literal);
                    break;
                  case "date":
                    decodedLiteralEither =
                      LiteralDecoder.decodeDateLiteral(literal);
                    break;
                  case "datetime":
                    decodedLiteralEither =
                      LiteralDecoder.decodeDateTimeLiteral(literal);
                    break;
                  case "float":
                  case "int":
                    decodedLiteralEither =
                      LiteralDecoder.decodeNumberLiteral(literal);
                    break;
                  case "string":
                    decodedLiteralEither =
                      LiteralDecoder.decodeStringLiteral(literal);
                    break;
                  default:
                    literalDatatypeDefinition satisfies never;
                    throw new Error("should never reach this point");
                }

                return decodedLiteralEither
                  .mapLeft((error) => {
                    logger.warn(
                      { error, jsonLd },
                      "unable to decode JSON-LD literal into an .xlsx-safe type, falling back to string",
                    );
                    return literal.value;
                  })
                  .extract();
              } else {
                logger.warn(
                  { jsonLd },
                  "unrecognized JSON-LD literal @type while trying to decode literal into an .xlsx-safe type, falling back to string",
                );
                return jsonLdValueObject["@value"];
              }
            }

            // xsd:string
            return jsonLdValueObject["@value"];
          }

          const jsonLdNodeObject =
            jsonLdNodeObjectSchema.safeParse(jsonLd).data;
          if (jsonLdNodeObject) {
            return jsonLdNodeObject["@id"];
          }

          const record: Record<
            string,
            boolean | null | number | object | string | undefined
          > = {};
          for (const [key, value] of Object.entries(jsonLd)) {
            // Intercept rdf:langString value objects and rewrite the key to property@language
            const jsonLdValueObject =
              jsonLdValueObjectSchema.safeParse(value)?.data;
            if (jsonLdValueObject?.["@language"]) {
              record[`${key}@${jsonLdValueObject["@language"]}`] =
                jsonLdValueObject["@value"];
            } else if (Array.isArray(value)) {
              const otherElements: unknown[] = [];
              const stringElementsByLanguage = new Map<string, string[]>();
              for (const arrayElement of value) {
                const jsonLdValueObject =
                  jsonLdValueObjectSchema.safeParse(arrayElement).data;
                const language = jsonLdValueObject?.["@language"];
                if (language) {
                  const existingStringElements =
                    stringElementsByLanguage.get(language) ?? [];
                  existingStringElements.push(jsonLdValueObject["@value"]);
                  stringElementsByLanguage.set(
                    language,
                    existingStringElements,
                  );
                } else {
                  otherElements.push(arrayElement);
                }
              }

              for (const [
                language,
                stringElements,
              ] of stringElementsByLanguage) {
                record[`${key}@${language}`] = stringElements;
              }

              if (
                otherElements.length > 0 ||
                stringElementsByLanguage.size === 0
              ) {
                record[key] = otherElements.map(convertJsonLdTypesToXlsxTypes);
              }
            } else {
              // Not an rdf:langString or an array of them
              record[key] = convertJsonLdTypesToXlsxTypes(value);
            }
          }
          return record;
        }
        case "string":
          if (DATE_ISO_STRING_REGEX.test(jsonLd)) {
            // If the string exactly matches the format of Date.toISOString() or Date.toISOString().slice(0, 10) (date only)
            // then convert it to a Date.
            return new Date(jsonLd);
          } else {
            return jsonLd;
          }
        default:
          throw new RangeError(`unsupported JSON-LD type: ${typeof jsonLd}`);
      }
    }

    return flatten(convertJsonLdTypesToXlsxTypes(jsonLdObject)) as Record<
      string,
      Cell.Value
    >;
  };
}
