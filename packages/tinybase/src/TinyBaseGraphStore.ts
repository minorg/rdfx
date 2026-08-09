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

import { Parser } from "n3";
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
    parseGraph,
    tinyBaseStore,
  }: {
    dataFactory: DataFactory;
    datasetFactory: DatasetCoreFactory;
    logger: Logger;
    parseGraph?: (
      identifier: GraphIdentifier,
      ntriples: string,
    ) => Either<Error, Quad[]>;
    tinyBaseStore?: TinyBaseGraphStore.TinyBaseStore;
  }) {
    this.dataFactory = dataFactory;
    this.datasetFactory = datasetFactory;
    this.logger = logger;
    this.parseGraph =
      parseGraph ??
      ((identifier: GraphIdentifier, ntriples: string) =>
        Either.encase(() => {
          const parser = new Parser({ format: "application/n-triples" });
          // Hack to put the quads in this named graph rather than rewriting them all after parsing.
          (parser as any).DEFAULTGRAPH = identifier;
          return parser.parse(ntriples);
        }));
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

  deleteSync(identifier: GraphIdentifier): Either<Error, object> {
    return Either.encase(() => {
      this.tinyBaseStore.delRow("graph", GraphIdentifier.stringify(identifier));
      return {};
    });
  }

  async get(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return this.getStreamSync(identifier);
  }

  getQuadsSync(
    identifier?: GraphIdentifier,
  ): Either<Error, Maybe<readonly Quad[]>> {
    return Either.encase(() => {
      if (identifier) {
        const row = this.tinyBaseStore.getRow(
          "graph",
          GraphIdentifier.stringify(identifier),
        );
        if (Object.values(row).length === 0) {
          return Maybe.empty();
        }

        const parsedQuadsEither = this.parseGraph(identifier, row.ntriples!);
        if (parsedQuadsEither.isLeft()) {
          this.logger.warn(
            "error parsing row %s: %s",
            GraphIdentifier.stringify(identifier),
            parsedQuadsEither.extract().message,
          );
          return Maybe.empty();
        }

        return Maybe.of(parsedQuadsEither.extract() as Quad[]);
      } else {
        const startTimestampMs = performance.now();

        let quads: Quad[] = [];
        const rows = Object.entries(this.tinyBaseStore.getTable("graph"));
        // this.logger.debug("parsing %d rows", rows.length);
        for (const [rowId, row] of rows) {
          // this.logger.debug("parsing row %s", rowId);
          const identifier = GraphIdentifier.parse(this.dataFactory, rowId);
          this.parseGraph(identifier, row.ntriples!)
            .ifLeft((error) => {
              this.logger.warn(
                "error parsing row %s: %s",
                rowId,
                error.message,
              );
            })
            .ifRight((newQuads) => {
              quads = quads.concat(newQuads);
            });
        }

        const elapsedTimeMs = performance.now() - startTimestampMs;
        this.logger.debug(
          "parsed %d quads from %d rows in %.2fms",
          quads,
          rows.length,
          elapsedTimeMs,
        );

        return Maybe.of(quads);
      }
    });
  }

  getStreamSync(identifier?: GraphIdentifier): Either<Error, Maybe<Stream>> {
    return this.getQuadsSync(identifier).map((quadsMaybe) =>
      quadsMaybe.map((quads) => iterableToStream(quads)),
    );
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return this.headSync(identifier);
  }

  headSync(identifier: GraphIdentifier): Either<Error, boolean> {
    return Either.encase(() =>
      this.tinyBaseStore.hasRow("graph", GraphIdentifier.stringify(identifier)),
    );
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return this.identifiersSync();
  }

  identifiersSync(): Either<Error, readonly GraphIdentifier[]> {
    return Either.encase(() =>
      this.tinyBaseStore
        .getRowIds("graph")
        .map((rowId) => GraphIdentifier.parse(this.dataFactory, rowId)),
    );
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return this.isEmptySync();
  }

  isEmptySync(): Either<Error, boolean> {
    return Either.encase(() => this.tinyBaseStore.getRowCount("graph") === 0);
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return new Promise((resolve) => {
      const datasetsByGraphIdentifier = new Map<string, DatasetCore>();

      quads
        .on("data", (quad: Quad) => {
          const identifier = GraphIdentifier.fromQuadGraph(
            quad.graph,
          ).unsafeCoerce();
          const graphIdentifierString_ = GraphIdentifier.stringify(identifier);

          let dataset = datasetsByGraphIdentifier.get(graphIdentifierString_);
          if (!dataset) {
            dataset = this.datasetFactory.dataset();
            datasetsByGraphIdentifier.set(graphIdentifierString_, dataset);
            this.getQuadsSync(identifier)
              .unsafeCoerce()
              .ifJust((existingDataset) => {
                for (const quad of existingDataset) {
                  dataset!.add(
                    this.dataFactory.quad(
                      quad.subject,
                      quad.predicate,
                      quad.object,
                    ),
                  );
                }
              });
          }
          dataset.add(
            this.dataFactory.quad(quad.subject, quad.predicate, quad.object),
          );
        })
        .on("end", () => {
          for (const [
            identifier,
            dataset,
          ] of datasetsByGraphIdentifier.entries()) {
            const ntriples: string[] = [];
            for (const quad of dataset) {
              ntriples.push(NTriplesTerm.stringify(quad));
            }
            this.tinyBaseStore.setRow("graph", identifier, {
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
          const graphIdentifierString_ = GraphIdentifier.stringify(
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
            identifier,
            ntriples,
          ] of ntriplesByGraphIdentifier.entries()) {
            this.tinyBaseStore.setRow("graph", identifier, {
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

  private readonly parseGraph: (
    identifier: GraphIdentifier,
    ntriples: string,
  ) => Either<Error, Quad[]>;
}

export namespace TinyBaseGraphStore {
  export type TinyBaseStore = Store<[typeof tablesSchema, NoValuesSchema]>;

  export const tablesSchema = {
    graph: {
      ntriples: { type: "string" },
    },
  } as const;
}
