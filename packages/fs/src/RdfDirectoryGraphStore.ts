import { Buffer } from "node:buffer";
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

import type { FileSystem } from "./FileSystem.js";
import { NodeFileSystem } from "./NodeFileSystem.js";
import { RdfDirectory } from "./RdfDirectory.js";
import type { RdfFile } from "./RdfFile.js";
import { RdfFormat } from "./RdfFormat.js";
import { uncompressedRdfFormatsByMimeType } from "./uncompressedRdfFormatsByMimeType.js";

/**
 * A GraphStore implementation backed by files in a directory.
 */
export class RdfDirectoryGraphStore implements GraphStore {
  private readonly fileSystem: FileSystem;
  private readonly logger: Logger;

  static readonly fileFormat =
    uncompressedRdfFormatsByMimeType["application/n-triples"];

  constructor(
    readonly path: string,
    options?: {
      fileSystem?: FileSystem;
      logger?: Logger;
    },
  ) {
    this.fileSystem = options?.fileSystem ?? NodeFileSystem.instance;
    this.logger = options?.logger ?? dummyLogger;
  }

  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      for (const dirent of await liftEither(
        await this.fileSystem.readDirectory(this.path, { recursive: true }),
      )) {
        if (!dirent.isFile()) {
          continue;
        }
        const direntPath = path.join(dirent.parentPath, dirent.name);
        const formatEither = RdfFormat.fromPath(direntPath);
        if (formatEither.isLeft()) {
          this.logger.debug("%s is not an RDF file, ignoring", direntPath);
          continue;
        }
        await liftEither(await this.fileSystem.deleteFile(direntPath));
      }
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(
        await this.fileSystem.deleteFile(this.graphFilePath(identifier), {
          force: true,
        }),
      );
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

      const stream = parser.import(
        this.fileSystem.createReadStream(this.graphFilePath(identifier)),
      );
      return Maybe.of(
        identifier.termType === "DefaultGraph"
          ? stream
          : (stream as Readable).map((quad: Quad) =>
              dataFactory.quad(
                quad.subject,
                quad.predicate,
                quad.object,
                identifier,
              ),
            ),
      );
    });
  }

  graphFilePath(identifier: GraphIdentifier | string): string {
    const identifierString =
      typeof identifier === "object"
        ? GraphIdentifier.stringify(identifier)
        : identifier;
    return path.join(
      this.path,
      identifierString.length === 0
        ? "default.nq"
        : `${Buffer.from(identifierString).toString("base64url")}.nq`,
    );
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return EitherAsync(async ({ liftEither }) => {
      const statEither = await this.fileSystem.stat(
        this.graphFilePath(identifier),
      );
      if (statEither.isLeft() && statEither.extract().code === "ENOENT") {
        return false;
      }
      return (await liftEither(statEither)).isFile();
    });
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
      for await (const _ of this.files()) {
        return false;
      }
      return true;
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
      this.logger.debug("parsing dataset from %s", this.path);
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
        this.path,
      );

      return unionDataset;
    });
  }

  private async *files(): AsyncIterable<[RdfFile, GraphIdentifier]> {
    for await (const file of new RdfDirectory(this.path, {
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
        const graphFilePath = this.graphFilePath(graphIdentifierString);

        if (method === "post") {
          ntriples = (
            await liftEither(
              (
                await this.fileSystem.readFile(graphFilePath)
              )
                .map((buffer) =>
                  new TextDecoder("utf-8").decode(buffer).split("\n"),
                )
                .chainLeft((error) =>
                  error.code === "ENOENT"
                    ? Either.of([] as readonly string[])
                    : Left(error),
                ),
            )
          ).concat(ntriples);
        }

        ntriples.sort();

        await liftEither(
          await this.fileSystem.writeFile(
            graphFilePath,
            new TextEncoder().encode(ntriples.join("\n")),
          ),
        );
      }

      return {};
    });
  }
}

const parser = parsers({ dataFactory }).get(
  RdfDirectoryGraphStore.fileFormat.mimeType,
)!;
