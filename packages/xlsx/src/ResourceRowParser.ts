import type { DataFactory, DatasetCoreFactory, Quad } from "@rdfjs/types";
import type { Logger } from "@rdfx/logger";
import type { Either } from "purify-ts";
import type { ResourceRow } from "./ResourceRow.js";

export interface ResourceRowParser {
  /**
   * Parse a ResourceRow into an array of RDF Quads.
   * 
   * Receives dataFactory and other parameters here so they don't have to be passed to constructors.
   */
  parse(resourceRow: ResourceRow, parent: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    logger: Logger;
  }): Either<Error, readonly Quad[]>;
}
