import type { DataFactory } from "@rdfjs/types";
import type { Logger } from "@rdfx/logger";

export abstract class AbstractParser {
  protected readonly dataFactory: DataFactory;
  protected readonly logger: Logger;

  constructor({
    dataFactory,
    logger,
  }: {
    dataFactory: DataFactory;
    logger: Logger;
  }) {
    this.dataFactory = dataFactory;
    this.logger = logger;
  }
}
