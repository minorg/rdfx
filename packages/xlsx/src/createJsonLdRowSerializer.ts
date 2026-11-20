import type { DataFactory } from "@rdfjs/types";
import { LiteralDecoder, literalDatatypeDefinitions } from "@rdfx/literal";
import type { Logger } from "@rdfx/logger";
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
    "@value": z.string(),
  })
  .strict();

const jsonLdNodeObjectSchema = z
  .object({
    "@id": z.string().min(1),
  })
  .strict();

/**
 * Recursively convert JSON-LD to cell values, preserving arrays and objects.
 */
function convertJsonLdTypesToXlsxTypes(
  jsonLd: unknown,
  options: {
    dataFactory: DataFactory;
    logger: Logger;
    unwrapSingletonArrays: boolean;
  },
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
        if (jsonLd.length === 1 && options.unwrapSingletonArrays) {
          // Unwrap singleton array
          return convertJsonLdTypesToXlsxTypes(jsonLd[0], options);
        } else {
          return jsonLd.map((jsonLdArrayElement) =>
            convertJsonLdTypesToXlsxTypes(jsonLdArrayElement, options),
          );
        }
      }

      const jsonLdValueObject = jsonLdValueObjectSchema.safeParse(jsonLd).data;
      if (jsonLdValueObject) {
        if (jsonLdValueObject["@language"]) {
          // rdf:langString
          return jsonLd;
        }

        if (jsonLdValueObject["@type"]) {
          const { dataFactory, logger } = options;
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
                decodedLiteralEither = LiteralDecoder.decodeBigDecimalLiteral(
                  literal,
                ).map((_) => _.toFixed());
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

      const jsonLdNodeObject = jsonLdNodeObjectSchema.safeParse(jsonLd).data;
      if (jsonLdNodeObject) {
        return jsonLdNodeObject["@id"];
      }

      const record: Record<
        string,
        boolean | null | number | object | string | undefined
      > = {};
      for (const [key, value] of Object.entries(jsonLd)) {
        record[key] = convertJsonLdTypesToXlsxTypes(value, options);
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

function flatten(
  node: unknown,
  keyPrefix: string,
  out: Record<string, Cell.Value>,
  unwrapSingletonArrays: boolean,
): Record<string, Cell.Value> {
  if (node == null) {
    return out;
  }

  switch (typeof node) {
    case "boolean":
    case "number":
    case "string":
      out[keyPrefix] = node;
      return out;
    case "object":
      if (node instanceof Date) {
        out[keyPrefix] = node;
        return out;
      }
      break;
    default:
      throw new RangeError(`unsupported cell type: ${typeof node}`);
  }

  const jsonLdValueObject = jsonLdValueObjectSchema.safeParse(node).data;
  if (jsonLdValueObject?.["@language"]) {
    out[`${keyPrefix}@${jsonLdValueObject["@language"]}`] =
      jsonLdValueObject["@value"];
    return out;
  }

  if (Array.isArray(node)) {
    const langStringValuesByLanguage = new Map<string, string[]>();
    const otherValues: unknown[] = [];
    for (const element of node) {
      const jsonLdValueObject = jsonLdValueObjectSchema.safeParse(element).data;
      if (jsonLdValueObject?.["@language"]) {
        const langStringValues =
          langStringValuesByLanguage.get(jsonLdValueObject["@language"]) ?? [];
        langStringValues.push(jsonLdValueObject["@value"]);
        langStringValuesByLanguage.set(
          jsonLdValueObject["@language"],
          langStringValues,
        );
      } else {
        otherValues.push(element);
      }
    }

    // property@language, with .N only when a language has several values
    for (const [language, values] of langStringValuesByLanguage) {
      const key = `${keyPrefix}@${language}`;
      if (values.length === 1 && unwrapSingletonArrays) {
        out[key] = values[0];
      } else {
        values.forEach((value, i) => {
          out[`${key}.${i}`] = value;
        });
      }
    }

    if (otherValues.length === 1 && unwrapSingletonArrays) {
      flatten(otherValues[0], keyPrefix, out, unwrapSingletonArrays);
    } else {
      otherValues.forEach((element, i) => {
        flatten(element, `${keyPrefix}.${i}`, out, unwrapSingletonArrays);
      });
    }

    return out;
  }

  // A Record-like object
  for (const [key, value] of Object.entries(node)) {
    flatten(
      value,
      keyPrefix ? `${keyPrefix}.${key}` : key,
      out,
      unwrapSingletonArrays,
    );
  }

  return out;
}

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
  options: {
    dataFactory: DataFactory;
    logger: Logger;
    unwrapSingletonArrays?: boolean;
  },
) => Worksheet.Builder.Row {
  return (object, options) => {
    const jsonLdObject = intermediateObjectFunctions.toJson(object);

    return flatten(
      convertJsonLdTypesToXlsxTypes(jsonLdObject, {
        ...options,
        unwrapSingletonArrays: !!options?.unwrapSingletonArrays,
      }),
      "",
      {},
      !!options?.unwrapSingletonArrays,
    );
  };
}
