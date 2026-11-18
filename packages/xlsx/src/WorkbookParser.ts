import type { DataFactory } from "@rdfjs/types";
import type { NamespaceBuilder, PrefixMap } from "@rdfx/iri";
import type { Logger } from "@rdfx/logger";
import type { Either } from "purify-ts";
import type { Workbook } from "./Workbook.js";

export type WorkbookParser<ResultT> = (
  workbook: Workbook,
  options: {
    dataFactory: DataFactory;
    defaultNamespace?: NamespaceBuilder;
    logger: Logger;
    prefixMap?: PrefixMap;
  },
) => Either<Error, ResultT>;
