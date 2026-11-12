import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory, DatasetCoreFactory } from "@rdfjs/types";

import type { Logger } from "@rdfx/logger";
import type { Maybe } from "purify-ts";

export abstract class AbstractParser {
  protected readonly dataFactory: DataFactory;
  protected readonly datasetFactory: DatasetCoreFactory;
  protected readonly logger: Logger;
  protected readonly prefixMap: Maybe<PrefixMap>;
  protected readonly defaultNamespace: Maybe<NamespaceBuilder>;

  constructor({
    dataFactory,
    datasetFactory,
    defaultNamespace,
    logger,
    prefixMap,
  }: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    defaultNamespace: Maybe<NamespaceBuilder>;
    logger: Logger;
    prefixMap: Maybe<PrefixMap>;
  }) {
    this.dataFactory = dataFactory;
    this.datasetFactory = datasetFactory;
    this.defaultNamespace = defaultNamespace;
    this.logger = logger;
    this.prefixMap = prefixMap;
  }
}
