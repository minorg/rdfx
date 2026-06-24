import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import datasetFactory from "@rdfjs/dataset";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { GraphIdentifier, type GraphStore } from "@rdfx/graph-store";
import parsers from "@rdfx/parsers";
import { NTriplesTerm } from "@rdfx/string";
import { Either, EitherAsync, Left, Maybe } from "purify-ts";
import { dummyLogger, type Logger } from "ts-log";
import { RdfDirectory } from "./RdfDirectory.js";
import type { RdfFile } from "./RdfFile.js";
import { stat } from "./stat.js";

/**
 * A GraphStore implementation backed by files in a directory.
 */
export class RdfDirectoryGraphStore implements GraphStore {
  private readonly logger: Logger;

  constructor(
    readonly directoryPath: string,
    options?: { logger?: Logger },
  ) {
    this.logger = options?.logger ?? dummyLogger;
  }

  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async () => {
      await fs.promises.rm(this.directoryPath, {
        force: true,
        recursive: true,
      });
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return EitherAsync(async () => {
      try {
        await fs.promises.rm(this.graphFilePath(identifier));
      } catch (error) {
        if (errorCode(error) !== "ENOENT") {
          throw error;
        }
      }
      return {};
    });
  }

  async get(
    identifier: GraphIdentifier,
  ): Promise<Either<Error, Maybe<Stream>>> {
    return EitherAsync(async ({ liftEither }) => {
      if (!(await liftEither(await this.head(identifier)))) {
        return Maybe.empty();
      }

      let stream: Stream = parser.import(
        fs.createReadStream(this.graphFilePath(identifier)),
      );
      if (identifier.termType !== "DefaultGraph") {
        stream = (stream as Readable).map((quad: Quad) =>
          dataFactory.quad(
            quad.subject,
            quad.predicate,
            quad.object,
            identifier,
          ),
        );
      }
      return Maybe.of(stream);
    });
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return (
      await EitherAsync<Error, boolean>(async ({ liftEither }) =>
        (await liftEither(await stat(this.graphFilePath(identifier)))).isFile(),
      )
    ).chainLeft((error) =>
      errorCode(error) === "ENOENT"
        ? Either.of<Error, boolean>(false)
        : Left<Error, boolean>(error),
    );
  }

  async identifiers(): Promise<Either<Error, readonly GraphIdentifier[]>> {
    return EitherAsync(async () => {
      const identifiers: GraphIdentifier[] = [];
      for await (const [_, identifier] of this.files()) {
        identifiers.push(identifier);
      }
      return identifiers;
    });
  }

  async isEmpty(): Promise<Either<Error, boolean>> {
    return EitherAsync(async () => {
      try {
        return (await fs.promises.readdir(this.directoryPath)).length === 0;
      } catch (error) {
        if (errorCode(error) === "ENOENT") {
          return true;
        }
        throw error;
      }
    });
  }

  async post(quads: Stream): Promise<Either<Error, object>> {
    return this.postOrPut("post", quads);
  }

  async put(quads: Stream): Promise<Either<Error, object>> {
    return this.postOrPut("put", quads);
  }

  async unionDataset(): Promise<Either<Error, DatasetCore>> {
    return EitherAsync(async ({ liftEither }) => {
      this.logger.debug("parsing dataset from %s", this.directoryPath);
      const unionDataset = datasetFactory.dataset();

      for await (const [file, graphIdentifier] of this.files()) {
        const fileDataset = datasetFactory.dataset();
        await liftEither(await file.parseInto(fileDataset));
        this.logger.debug(
          "parsed %d quads from %s",
          fileDataset.size,
          file.path,
        );

        for (const quad of fileDataset) {
          if (quad.graph.termType !== "DefaultGraph") {
            throw new Error(`${file.path} quad is not in default graph`);
          }
          unionDataset.add(
            dataFactory.quad(
              quad.subject,
              quad.predicate,
              quad.object,
              graphIdentifier,
            ),
          );
        }
      }

      this.logger.debug(
        "parsed %d quads from %s",
        unionDataset.size,
        this.directoryPath,
      );

      return unionDataset;
    });
  }

  private async *files(): AsyncIterable<[RdfFile, GraphIdentifier]> {
    for await (const file of new RdfDirectory(this.directoryPath, {
      logger: this.logger,
    }).files()) {
      const fileStem = path.basename(file.path, path.extname(file.path));
      if (!/^[-A-Za-z0-9\-_]+$/.test(fileStem)) {
        this.logger.debug(
          "ignoring RDF file %s with non-Base64url-encoded file name",
          file.path,
        );
        continue;
      }

      const graphIdentifier =
        fileStem === "default"
          ? dataFactory.defaultGraph()
          : dataFactory.namedNode(
              Buffer.from(fileStem, "base64url").toString(),
            );
      this.logger.debug(
        "RDF file %s graph identifier: %s",
        file.path,
        graphIdentifier,
      );
      yield [file, graphIdentifier];
    }
  }

  private graphFilePath(identifier: GraphIdentifier | string): string {
    const identifierString =
      typeof identifier === "object"
        ? GraphIdentifier.stringify(identifier)
        : identifier;
    return path.join(
      this.directoryPath,
      identifierString.length === 0
        ? "default.nq"
        : `${Buffer.from(identifierString).toString("base64url")}.nq`,
    );
  }

  private async postOrPut(
    method: "post" | "put",
    quads: Stream,
  ): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      const ntriplesByGraphIdentifier = new Map<string, string[]>();
      await liftEither(
        await new Promise<Either<Error, void>>((resolve) => {
          quads.on("data", (quad: Quad) => {
            const graphIdentifierString = GraphIdentifier.stringify(
              GraphIdentifier.fromQuadGraph(quad.graph).unsafeCoerce(),
            );
            let ntriples = ntriplesByGraphIdentifier.get(graphIdentifierString);
            if (!ntriples) {
              ntriples = [];
              ntriplesByGraphIdentifier.set(graphIdentifierString, ntriples);
            }
            ntriples.push(
              `${NTriplesTerm.stringify(quad.subject)} ${NTriplesTerm.stringify(quad.predicate)} ${NTriplesTerm.stringify(quad.object)} .`,
            );
          });
          quads.on("end", () => resolve(Either.of(undefined)));
          quads.on("error", (error: Error) => resolve(Left(error)));
        }),
      );

      for (let [
        graphIdentifierString,
        ntriples,
      ] of ntriplesByGraphIdentifier.entries()) {
        await fs.promises.mkdir(this.directoryPath, {
          recursive: true,
        });
        const graphFilePath = this.graphFilePath(graphIdentifierString);
        if (method === "post") {
          try {
            ntriples = (await fs.promises.readFile(graphFilePath))
              .toString("utf-8")
              .split("\n")
              .concat(ntriples);
          } catch (error) {
            if (errorCode(error) !== "ENOENT") {
              throw error;
            }
          }
        }
        ntriples.sort();
        await fs.promises.writeFile(
          graphFilePath,
          ntriples.join("\n"),
          "utf-8",
        );
      }

      return {};
    });
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? (error.code as string)
    : undefined;
}

const parser = parsers({ dataFactory }).get("application/n-quads")!;
