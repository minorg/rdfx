import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";
import { type Either, Left } from "purify-ts";
import { appendRecordValue } from "./appendRecordValue.js";
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
    const jsonLdObject: Record<string, unknown> = {};
    for (const [key, cells] of Object.entries(row.toRecord())) {
      let jsonLdObjectKey: string;
      let language: string | undefined;
      if (key.startsWith("@")) {
        jsonLdObjectKey = key;
      } else {
        [jsonLdObjectKey, language] = key.split("@", 2);

        jsonLdObjectKey = jsonLdObjectKey.trim();
        if (jsonLdObjectKey.length === 0) {
          return Left(new Error(`invalid header: ${key}`));
        }

        if (language) {
          language = language.trim();
          if (language.length === 0) {
            language = undefined;
          }
        }
      }

      for (const cell of Array.isArray(cells) ? cells : [cells]) {
        const cellHyperlink = cell.hyperlink.extract();
        if (cellHyperlink) {
          appendRecordValue(
            jsonLdObject,
            jsonLdObjectKey,
            cellHyperlink.target,
          );
          continue;
        }
        const cellValue = cell.value.extract();
        if (cellValue === undefined) {
          continue;
        }
        switch (typeof cellValue) {
          case "boolean":
          case "number":
            appendRecordValue(jsonLdObject, jsonLdObjectKey, cellValue);
            break;
          case "object":
            if (cellValue instanceof Date) {
              appendRecordValue(
                jsonLdObject,
                jsonLdObjectKey,
                cellValue.toISOString(),
              );
              break;
            }
            throw new RangeError("unexpected object cell value");
          case "string": {
            if (language) {
              appendRecordValue(jsonLdObject, jsonLdObjectKey, {
                "@language": language,
                "@value": cellValue,
              });
            } else {
              appendRecordValue(jsonLdObject, jsonLdObjectKey, cellValue);
            }
            break;
          }
        }
      }
    }

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
                dataset: options.datasetFactory.dataset(),
              }),
            }).dataset,
          ]),
    );
  };
}
