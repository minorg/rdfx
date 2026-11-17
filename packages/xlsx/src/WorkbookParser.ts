import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory, DatasetCoreFactory } from "@rdfjs/types";
import type { Logger } from "@rdfx/logger";
import type { Either } from "purify-ts";
import type { Workbook } from "./Workbook.js";

export type WorkbookParser<ResultT> = (
  workbook: Workbook,
  options: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    defaultNamespace?: NamespaceBuilder;
    logger: Logger;
    prefixMap?: PrefixMap;
  },
) => Either<Error, ResultT>;
