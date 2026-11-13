import type { DataFactory, DatasetCoreFactory } from "@rdfjs/types";

import type { Logger } from "@rdfx/logger";

export abstract class AbstractParser {
  protected readonly dataFactory: DataFactory;
  protected readonly datasetFactory: DatasetCoreFactory;
  protected readonly logger: Logger;

  constructor({
    dataFactory,
    datasetFactory,
    logger,
  }: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    logger: Logger;
  }) {
    this.dataFactory = dataFactory;
    this.datasetFactory = datasetFactory;
    this.logger = logger;
  }
}
