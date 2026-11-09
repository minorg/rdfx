import type { DataFactory } from "@rdfjs/types";
import { LiteralFactory } from "@rdfx/literal";
import type { Logger } from "@rdfx/logger";
import { Memoize } from "typescript-memoize";

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

  @Memoize()
  protected get literalFactory(): LiteralFactory {
    return new LiteralFactory({ dataFactory: this.dataFactory });
  }
}
