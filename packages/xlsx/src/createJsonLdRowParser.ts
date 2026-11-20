import type { Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import type { NamespaceBuilder, PrefixMap } from "@rdfx/iri";
import { type Resource, ResourceSet } from "@rdfx/resource";
import { unflatten } from "flat";
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

type Unflattened<CellT> =
  | CellT
  | { [key: string]: Unflattened<CellT> }
  | Unflattened<CellT>[];

type JsonLdValue =
  | boolean
  | null
  | number
  | string
  | undefined
  | LangStringJsonLdObject;

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
     * Recursively coalesce lang string key: value entries { "label@en": string } to
     * arrays of JSON-LD value objects { "@language": string, "@value": string }.
     *
     * For example,
     *   { "label@en": "enlabel", "label@fr": "frlabel" } becomes
     * becomes
     *   { "label": [{ "@language": "en", "@value": "enlabel" }, { "@language": "fr", "@value": "frlabel" }] }
     */
    function coalesceLangStrings(
      jsonLd: Unflattened<JsonLdValue>,
    ): Unflattened<JsonLdValue> {
      if (jsonLd === null || typeof jsonLd !== "object") {
        return jsonLd;
      }

      if (Array.isArray(jsonLd)) {
        return jsonLd.map(coalesceLangStrings);
      }

      const convertedRecord: Record<string, Unflattened<JsonLdValue>> = {};
      for (const [key, value] of Object.entries(jsonLd)) {
        const langStringKeyMatch = LANG_STRING_KEY_REGEX.exec(key);
        if (langStringKeyMatch) {
          // key is property@language
          // The regex excludes keys starting with @ like "@id"
          const [, property, language] = langStringKeyMatch;
          const langStrings: LangStringJsonLdObject[] = [];
          for (const arrayElement of Array.isArray(value) ? value : [value]) {
            if (typeof arrayElement !== "string") {
              logger.warn(
                "%s: expected a text cell, found %s",
                key,
                typeof arrayElement,
              );
              continue;
            }

            langStrings.push({ "@language": language, "@value": arrayElement });
          }
          if (langStrings.length > 0) {
            appendRecordValues(convertedRecord, property, langStrings);
          }
        } else {
          // key is not property@language, recurse
          const convertedValue = coalesceLangStrings(value);
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

    /**
     * Recursively convert a Row Record (Record<string, Cell>) to a JSON-LD object.
     */
    function convertXlsxTypesToJsonLdTypes(
      xlsxTreeNode: Unflattened<Cell>,
    ): Unflattened<JsonLdValue> {
      if (Array.isArray(xlsxTreeNode)) {
        return xlsxTreeNode.map(convertXlsxTypesToJsonLdTypes);
      }

      if (xlsxTreeNode instanceof Cell) {
        const cell = xlsxTreeNode;
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
      for (const [key, value] of Object.entries(xlsxTreeNode)) {
        const convertedValue = convertXlsxTypesToJsonLdTypes(value);
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
      return convertedRecord;
    }

    const flatJsonLdObject = convertXlsxTypesToJsonLdTypes(row.toRecord());
    const unflattenedJsonLdObject: Unflattened<JsonLdValue> =
      unflatten(flatJsonLdObject);
    const coalescedJsonLdObject = coalesceLangStrings(unflattenedJsonLdObject);

    return intermediateObjectFunctions.Json.parse(coalescedJsonLdObject).chain(
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
