#!/usr/bin/env npm exec tsx --

import { exec as execCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { promisify } from "node:util";
import datasetFactory from "@rdfjs/dataset";
import PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import dataFactory from "@rdfx/data-factory";
import { RdfDirectory, RdfFile } from "@rdfx/fs";
import { Compiler, ShapesGraph, TsGenerator } from "@shaclmate/compiler";
import type { Logger } from "ts-log";

const exec = promisify(execCallback);

const logger: Logger = console;

const thisDirectoryPath = path.dirname(url.fileURLToPath(import.meta.url));

async function formatTsFile(tsFilePath: string): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await exec(`npm exec biome -- check --write ${tsFilePath}`, {
      cwd: thisDirectoryPath,
    });
  }
}

async function main() {
  const prefixMap = new PrefixMap(undefined, { factory: dataFactory });

  const inputDirectoryPath = path.join(thisDirectoryPath, "shapes");
  const combinedInputDataset = datasetFactory.dataset();

  for (const inputDirent of await fs.readdir(inputDirectoryPath, {
    withFileTypes: true,
  })) {
    const inputDataset = datasetFactory.dataset();
    const inputDirentPath = path.join(inputDirectoryPath, inputDirent.name);

    if (inputDirent.isFile()) {
      if (inputDirent.name === "format.sh") {
        continue;
      }

      logger.debug("parsing %s", inputDirentPath);
      await RdfFile.fromPath(inputDirentPath, { logger })
        .unsafeCoerce()
        .parseInto(inputDataset, { prefixMap });
      logger.debug(
        "parsed %d quads from %s",
        inputDataset.size,
        inputDirentPath,
      );
    } else if (inputDirent.isDirectory()) {
      logger.debug("parsing %s", inputDirentPath);
      (
        await new RdfDirectory(inputDirentPath, { logger }).parseInto(
          inputDataset,
          { prefixMap },
        )
      ).unsafeCoerce();
      logger.debug(
        "parsed %d quads from %s",
        inputDataset.size,
        inputDirentPath,
      );
    } else {
      logger.debug("skipping non-file, non-directory %s", inputDirentPath);
    }

    for (const quad of inputDataset) {
      combinedInputDataset.add(quad);
    }
  }

  const output = ShapesGraph.builder()
    .parseDataset(combinedInputDataset, { prefixMap })
    .map((_) => _.build())
    .chain((shapesGraph) =>
      new Compiler({
        generator: new TsGenerator({
          configuration: {
            features: new Set(["Object.create", "Object.toRdf"]),
          },
          logger: console,
        }),
        logger,
      }).compile(shapesGraph),
    )
    .unsafeCoerce();

  const outputFilePath = path.join(thisDirectoryPath, "src", "shapes.ts");
  await fs.writeFile(outputFilePath, output);

  await formatTsFile(outputFilePath);
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
