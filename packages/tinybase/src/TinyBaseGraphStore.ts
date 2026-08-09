import type {
  DataFactory,
  DatasetCore,
  DatasetCoreFactory,
  Quad,
  Stream,
} from "@rdfjs/types";
import { GraphIdentifier, type GraphStore } from "@rdfx/graph-store";
import { iterableToStream } from "@rdfx/stream";
import { NTriplesTerm } from "@rdfx/string";
import { Either, Left, Maybe } from "purify-ts";
import {
  createMergeableStore,
  type NoValuesSchema,
  type Store,
} from "tinybase/with-schemas";
import type { Logger } from "ts-log";

export class TinyBaseGraphStore implements GraphStore {
  private readonly dataFactory: DataFactory;
  private readonly datasetFactory: DatasetCoreFactory;
  private readonly logger: Logger;
  readonly tinyBaseStore: TinyBaseGraphStore.TinyBaseStore;

  constructor({
    dataFactory,
    datasetFactory,
    logger,
    tinyBaseStore,
  }: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    logger: Logger;
    tinyBaseStore?: TinyBaseGraphStore.TinyBaseStore;
  }) {
    this.dataFactory = dataFactory;
    this.datasetFactory = datasetFactory;
    this.logger = logger;
    this.tinyBaseStore =
      tinyBaseStore ??
      createMergeableStore().setTablesSchema(TinyBaseGraphStore.tablesSchema);
  }

  async clear(): Promise<Either<Error, object>> {
    return this.clearSync();
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return this.deleteSync(identifier);
  }

  async getDataset(
    graphIdentifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<DatasetCore>>> {
    return this.getDatasetSync(graphIdentifier);
  }

  async getStream(
    graphIdentifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return this.getDatasetSync(graphIdentifier).map((datasetMaybe) =>
      datasetMaybe.map((dataset) => iterableToStream(dataset)),
    );
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return this.headSync(identifier);
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return this.identifiersSync();
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return this.isEmptySync();
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return new Promise((resolve) => {
      const datasetsByGraphIdentifier = new Map<string, DatasetCore>();

      quads
        .on("data", (quad: Quad) => {
          const graphIdentifier = GraphIdentifier.fromQuadGraph(
            quad.graph,
          ).unsafeCoerce();
          const graphIdentifierString_ = graphIdentifierString(graphIdentifier);

          let dataset = datasetsByGraphIdentifier.get(graphIdentifierString_);
          if (!dataset) {
            dataset = this.datasetFactory.dataset();
            datasetsByGraphIdentifier.set(graphIdentifierString_, dataset);
            this.getDatasetSync(graphIdentifier)
              .unsafeCoerce()
              .ifJust((existingDataset) => {
                for (const quad of existingDataset) {
                  dataset!.add(quad);
                }
              });
          }
          dataset.add(
            this.dataFactory.quad(quad.subject, quad.predicate, quad.object),
          );
        })
        .on("end", () => {
          for (const [
            graphIdentifier,
            dataset,
          ] of datasetsByGraphIdentifier.entries()) {
            const ntriples: string[] = [];
            for (const quad of dataset) {
              ntriples.push(NTriplesTerm.stringify(quad));
            }
            this.tinyBaseStore.setRow("graph", graphIdentifier, {
              ntriples: ntriples.join("\n"),
            });
          }

          resolve(Either.of({}));
        })
        .on("error", (error) => {
          resolve(Left(error));
        });
    });
  }

  async put(quads: Stream): Promise<Either<Error, object>> {
    return new Promise((resolve) => {
      const ntriplesByGraphIdentifier = new Map<string, string[]>();

      quads
        .on("data", (quad: Quad) => {
          const graphIdentifierString_ = graphIdentifierString(
            GraphIdentifier.fromQuadGraph(quad.graph).unsafeCoerce(),
          );
          let ntriples = ntriplesByGraphIdentifier.get(graphIdentifierString_);
          if (!ntriples) {
            ntriples = [];
            ntriplesByGraphIdentifier.set(graphIdentifierString_, ntriples);
          }
          ntriples.push(
            NTriplesTerm.stringify(
              this.dataFactory.quad(quad.subject, quad.predicate, quad.object),
            ),
          );
        })
        .on("end", () => {
          for (const [
            graphIdentifier,
            ntriples,
          ] of ntriplesByGraphIdentifier.entries()) {
            this.tinyBaseStore.setRow("graph", graphIdentifier, {
              ntriples: ntriples.join("\n"),
            });
          }

          resolve(Either.of({}));
        })
        .on("error", (error) => {
          resolve(Left(error));
        });
    });
  }

  private clearSync(): Either<Error, object> {
    return Either.encase(() => {
      this.tinyBaseStore.delTable("graph");
      return {};
    });
  }

  private deleteSync(identifier: GraphIdentifier): Either<Error, object> {
    return Either.encase(() => {
      this.tinyBaseStore.delRow("graph", graphIdentifierString(identifier));
      return {};
    });
  }

  private getDatasetSync(
    identifier: GraphIdentifier,
  ): Either<Error, Maybe<DatasetCore>> {
    return Either.encase(() => {
      const row = this.tinyBaseStore.getRow(
        "graph",
        graphIdentifierString(identifier),
      );
      if (Object.values(row).length === 0) {
        return Maybe.empty();
      }

      const parseCacheKey = row.ntriples!;

      {
        const cachedDataset = this.parseCache
          .getSync(parseCacheKey)
          .unsafeCoerce()
          .extract();
        if (cachedDataset) {
          return Maybe.of(cachedDataset);
        }
      }

      const parser = new Parser({ format: "application/n-triples" });
      // Hack to put the quads in this named graph rather than rewriting them all after parsing.
      (parser as any).DEFAULTGRAPH = identifier;
      let parsedQuads: Quad[];
      try {
        parsedQuads = parser.parse(row.ntriples!);
        // this.logger.debug("parsed %d quads from row %s", quadCount, rowId);
      } catch (e) {
        const error = e as Error;
        this.logger.warn(
          "error parsing row %s: %s",
          graphIdentifierString(identifier),
          error.message,
        );
        return Maybe.empty();
      }

      const parsedDataset = this.datasetFactory.dataset(parsedQuads);
      this.parseCache.setSync(parseCacheKey, parsedDataset);
      return Maybe.of(parsedDataset);
    });
  }

  private getUnionDatasetSync(): Either<Error, DatasetCore> {
    return Either.encase(() => {
      const startTimestampMs = performance.now();

      const dataset = this.datasetFactory.dataset();

      const parser = new N3Parser({ format: "application/n-triples" });
      const rows = Object.entries(this.tinyBaseStore.getTable("graph"));
      // this.logger.debug("parsing %d rows", rows.length);
      for (const [rowId, row] of rows) {
        // this.logger.debug("parsing row %s", rowId);
        const graphName = this.dataFactory.namedNode(rowId);
        try {
          const parseCacheKey = row.ntriples!;
          let rowDataset = this.parseCache
            .getSync(parseCacheKey)
            .unsafeCoerce()
            .extract();
          if (!rowDataset) {
            rowDataset = this.datasetFactory.dataset(
              parser.parse(row.ntriples!),
            );
            this.parseCache.setSync(parseCacheKey, rowDataset);
          }

          for (const quad of rowDataset) {
            dataset.add(
              this.dataFactory.quad(
                quad.subject,
                quad.predicate,
                quad.object,
                graphName,
              ),
            );
          }
          // this.logger.debug("parsed %d quads from row %s", quadCount, rowId);
        } catch (e) {
          const error = e as Error;
          this.logger.warn("error parsing row %s: %s", rowId, error.message);
        }
      }

      const elapsedTimeMs = performance.now() - startTimestampMs;
      this.logger.debug(
        "parsed %d quads from %d rows in %.2fms",
        dataset.size,
        rows.length,
        elapsedTimeMs,
      );

      return dataset;
    });
  }

  private headSync(identifier: GraphIdentifier): Either<Error, boolean> {
    return Either.encase(() =>
      this.tinyBaseStore.hasRow("graph", graphIdentifierString(identifier)),
    );
  }

  private identifiersSync(): Either<Error, readonly GraphIdentifier[]> {
    return Either.encase(() =>
      this.tinyBaseStore.getRowIds("graph").map(this.dataFactory.namedNode),
    );
  }

  private isEmptySync(): Either<Error, boolean> {
    return Either.encase(() => this.tinyBaseStore.getRowCount("graph") === 0);
  }
}

function graphIdentifierString(graphIdentifier: GraphIdentifier): string {
  switch (graphIdentifier.termType) {
    case "DefaultGraph":
      return "default";
    case "NamedNode":
      return graphIdentifier.value;
  }
}

export namespace TinyBaseGraphStore {
  export type TinyBaseStore = Store<[typeof tablesSchema, NoValuesSchema]>;

  export const tablesSchema = {
    graph: {
      ntriples: { type: "string" },
    },
  } as const;
}
