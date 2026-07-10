import { Buffer } from "node:buffer";
import path from "node:path";
import datasetFactory from "@rdfjs/dataset";
import type { DatasetCore, Quad, Stream } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { GraphIdentifier, type GraphStore } from "@rdfx/graph-store";
import { NTriplesTerm } from "@rdfx/string";
import { Either, EitherAsync, Left, Maybe } from "purify-ts";
import { RdfDirectory } from "./RdfDirectory.js";
import type { RdfFile } from "./RdfFile.js";
import { stat } from "./stat.js";

/**
 * A GraphStore implementation backed by files in a directory.
 */
export class RdfDirectoryGraphStore implements GraphStore {
  async clear(): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(
        await this.deleteDirectory(this.path, {
          force: true,
          recursive: true,
        }),
      );
      return {};
    });
  }

  async delete(identifier: GraphIdentifier): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      await liftEither(
        await this.deleteFile(this.graphFilePath(identifier), { force: true }),
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

      return Maybe.of(
        this.readFileStream(
          this.graphFilePath(identifier),
          identifier.termType !== "DefaultGraph"
            ? { overrideGraph: identifier }
            : undefined,
        ),
      );
    });
  }

  async head(identifier: GraphIdentifier): Promise<Either<Error, boolean>> {
    return EitherAsync(async ({ liftEither }) => {
      const statEither = await stat(this.graphFilePath(identifier));
      if (
        statEither.isLeft() &&
        this.errorCode(statEither.extract()) === "ENOENT"
      ) {
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

  private graphFilePath(identifier: GraphIdentifier | string): string {
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

  private async postOrPut(
    method: "post" | "put",
    quads: Stream,
  ): Promise<Either<Error, object>> {
    return EitherAsync(async ({ liftEither }) => {
      if (this.rdfFileFormat.compressionMethod.isJust()) {
        throw new RangeError(
          "only uncompressed writes are currently supported",
        );
      }
      switch (this.rdfFileFormat.rdfFormat) {
        case "application/n-quads":
        case "application/n-triples":
          break;
        default:
          throw new RangeError(
            "only N-Quads/N-Triples writes are currently supported",
          );
      }

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
        await liftEither(
          await this.createDirectory(this.path, { recursive: true }),
        );
        const graphFilePath = this.graphFilePath(graphIdentifierString);
        if (method === "post") {
          ntriples = (
            await liftEither(await this.readFileLines(graphFilePath))
          ).concat(ntriples);
        }
        ntriples.sort();
        await liftEither(await this.writeFileLines(graphFilePath, ntriples));
      }

      return {};
    });
  }
}
