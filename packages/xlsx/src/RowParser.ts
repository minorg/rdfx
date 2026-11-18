import type { DataFactory } from "@rdfjs/types";
import type { NamespaceBuilder, PrefixMap } from "@rdfx/iri";
import type { Logger } from "@rdfx/logger";
import type { Either } from "purify-ts";
import type { Row } from "./Row.js";

export type RowParser<ResultT> = (
  row: Row,
  options: {
    dataFactory: DataFactory;
    defaultNamespace?: NamespaceBuilder;
    logger: Logger;
    prefixMap?: PrefixMap;
  },
) => Either<Error, ResultT>;
