import type { DataFactory } from "@rdfjs/types";
import type { NamespaceBuilder, PrefixMap } from "@rdfx/iri";
import type { Logger } from "@rdfx/logger";
import type { Either } from "purify-ts";
import type { Worksheet } from "./Worksheet.js";

export type WorksheetParser<ResultT> = (
  worksheet: Worksheet,
  options: {
    dataFactory: DataFactory;
    defaultNamespace?: NamespaceBuilder;
    logger: Logger;
    prefixMap?: PrefixMap;
  },
) => Either<Error, ResultT>;
