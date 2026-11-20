import type { Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import type { NamespaceBuilder, PrefixMap } from "@rdfx/iri";
import { type Resource, ResourceSet } from "@rdfx/resource";
import type { Either } from "purify-ts";
import { Cell } from "./Cell.js";
import type { RowParser } from "./RowParser.js";

interface IntermediateObjectFunctions<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
> {
  Json: {
    parse(json: unknown): Either<Error, JsonObjectT>;
  };

  fromJson: (
    jsonObject: JsonObjectT,
    options?: {
      defaultNamespace?: NamespaceBuilder;
      prefixMap?: PrefixMap;
    },
  ) => Either<Error, IntermediateObjectT>;

  toRdfResource: (
    object: IntermediateObjectT,
    options?: {
      resourceSet?: ResourceSet;
    },
  ) => Resource;
}

/**
 * Append one or more values to a record entry, creating the entry if necessary.
 */
function appendRecordValues<T>(
  record: Record<string, T | T[]>,
  key: string,
  values: readonly T[],
): void {
  const existingValues = record[key];
  if (existingValues === undefined) {
    record[key] = values.concat();
  } else if (Array.isArray(existingValues)) {
    record[key] = existingValues.concat(values);
  } else {
    record[key] = [existingValues, ...values];
  }
}

const LANG_STRING_KEY_REGEX = /^([^@].*)@([^@]+)$/;

type LangStringJsonLdObject = { "@language": string; "@value": string };

type Unflattened<LeafNodeT> =
  | LeafNodeT
  | { [key: string]: Unflattened<LeafNodeT> }
  | Unflattened<LeafNodeT>[];
type JsonLdValue =
  | boolean
  | null
  | number
  | string
  | undefined
  | LangStringJsonLdObject;

function unflattenRowRecord(
  rowRecord: Record<string, Cell>,
): Unflattened<Cell> {
  const root: Record<string, any> = {};
  for (const [key, cell] of Object.entries(rowRecord)) {
    const segments = key.split(".");
    let node = root;
    for (let i = 0; i < segments.length - 1; i++) {
      node = node[segments[i]] ??= /^\d+$/.test(segments[i + 1]) ? [] : {};
    }
    node[segments[segments.length - 1]] = cell;
  }
  return root;
}

export function createJsonLdRowParser<
  IntermediateObjectT extends object,
  JsonObjectT extends object,
>(
  intermediateObjectFunctions: IntermediateObjectFunctions<
    IntermediateObjectT,
    JsonObjectT
  >,
): RowParser<readonly Quad[]> {
  return (row, options) => {
    const logger = options.logger;

    /**
     * Recursively convert an unflattened Row Record (Record<string, Cell>) to a JSON-LD object.
     *
     * Recursively coalesce lang string key: value entries { "label@en": string } to
     * arrays of JSON-LD value objects { "@language": string, "@value": string }.
     *
     * For example,
     *   { "label@en": "enlabel", "label@fr": "frlabel" } becomes
     * becomes
     *   { "label": [{ "@language": "en", "@value": "enlabel" }, { "@language": "fr", "@value": "frlabel" }] }
     */
    function convertUnflattenedXlsxToJsonLd(
      unflattenedXlsx: Unflattened<Cell>,
    ): Unflattened<JsonLdValue> {
      if (Array.isArray(unflattenedXlsx)) {
        return unflattenedXlsx.map(convertUnflattenedXlsxToJsonLd);
      }

      if (unflattenedXlsx instanceof Cell) {
        const cell = unflattenedXlsx;
        const cellHyperlink = cell.hyperlink.extract();
        if (cellHyperlink) {
          return cellHyperlink.target;
        }
        const cellValue = cell.value.extract();
        switch (typeof cellValue) {
          case "boolean":
          case "number":
          case "string":
          case "undefined":
            return cellValue;
          case "object": {
            if (cellValue instanceof Date) {
              return cellValue.toISOString();
            }
            throw new RangeError("unexpected object cell value");
          }
          default:
            throw new RangeError(
              `unsupported cell value type: ${typeof cellValue}`,
            );
        }
      }

      const convertedRecord: Record<string, Unflattened<JsonLdValue>> = {};
      for (const [key, value] of Object.entries(unflattenedXlsx)) {
        const langStringKeyMatch = LANG_STRING_KEY_REGEX.exec(key);
        if (langStringKeyMatch) {
          // key is property@language
          // The regex excludes keys starting with @ e.g., @id
          const [, property, language] = langStringKeyMatch;
          const langStrings: LangStringJsonLdObject[] = [];
          for (const arrayElement of Array.isArray(value) ? value : [value]) {
            if (!(arrayElement instanceof Cell)) {
              logger.warn(
                "%s: expected a text cell, found nested structure",
                key,
              );
              continue;
            }
            const cellValue = arrayElement.value.extract();
            if (typeof cellValue !== "string") {
              logger.warn(
                "%s: expected a text cell, found %s",
                key,
                typeof cellValue,
              );
              continue;
            }
            langStrings.push({ "@language": language, "@value": cellValue });
          }
          if (langStrings.length > 0) {
            appendRecordValues(convertedRecord, property, langStrings);
          }
        } else {
          // key is not property@language, recurse
          const convertedValue = convertUnflattenedXlsxToJsonLd(value);
          if (key in convertedRecord) {
            appendRecordValues(
              convertedRecord,
              key,
              Array.isArray(convertedValue) ? convertedValue : [convertedValue],
            );
          } else {
            convertedRecord[key] = convertedValue;
          }
        }
      }
      return convertedRecord;
    }

    const unflattenedRowRecord = unflattenRowRecord(row.toRecord());
    const jsonLdObject = convertUnflattenedXlsxToJsonLd(unflattenedRowRecord);

    return intermediateObjectFunctions.Json.parse(jsonLdObject).chain(
      (jsonObject) =>
        intermediateObjectFunctions
          .fromJson(jsonObject, {
            defaultNamespace: options?.defaultNamespace,
            prefixMap: options?.prefixMap,
          })
          .map((object) => [
            ...intermediateObjectFunctions.toRdfResource(object, {
              resourceSet: new ResourceSet({
                dataFactory: options.dataFactory,
                dataset: datasetFactory.dataset(),
              }),
            }).dataset,
          ]),
    );
  };
}
