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
import { ResourceSet } from "@rdfx/resource";
import { Compiler, ShapesGraph, TsGenerator } from "@shaclmate/compiler";
import type { Logger } from "ts-log";

const exec = promisify(execCallback);

const logger: Logger = console;

const shaclmate = {
  name: dataFactory.namedNode("http://purl.org/shaclmate/ontology#name"),
};

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
      await RdfFile.fromPath(inputDirentPath, { logger })
        .unsafeCoerce()
        .parseInto(inputDataset);
    } else if (inputDirent.isDirectory()) {
      // Treat a subdirectory as a single file
      // Needed to combine the SHACL shapes with SHACLmate extensions
      (
        await new RdfDirectory(inputDirentPath, { logger }).parseInto(
          inputDataset,
          { prefixMap },
        )
      ).unsafeCoerce();
    } else {
      continue;
    }

    const inputResourceSet = new ResourceSet({
      dataFactory,
      dataset: inputDataset,
    });

    const inputShapesGraph = ShapesGraph.builder()
      .parseDataset(inputDataset, { prefixMap })
      .unsafeCoerce()
      .build();

    for (const inputNodeShape of inputShapesGraph.nodeShapes) {
      if (inputNodeShape.$identifier().termType !== "NamedNode") {
        continue;
      }

      if (inputNodeShape.extern.orDefault(false)) {
        logger.debug(
          "%s: node shape %s is extern, skipping",
          inputDirentPath,
          inputNodeShape.$identifier(),
        );
        continue;
      } else if (inputNodeShape.shaclmateName.isNothing()) {
        logger.debug(
          "%s: node shape %s has no shaclmate:name, skipping",
          inputDirentPath,
          inputNodeShape.$identifier(),
        );
        continue;
      }

      const currentShaclmateName = inputNodeShape.shaclmateName.extract()!;
      const newShaclmateName = `${
        path
          .basename(inputDirentPath, path.extname(inputDirentPath))
          .split(".")[0]
      }_${currentShaclmateName}`;
      logger.debug(
        "renaming node shape %s to %s",
        currentShaclmateName,
        newShaclmateName,
      );
      inputResourceSet
        .resource(inputNodeShape.$identifier())
        .set(shaclmate.name, dataFactory.literal(newShaclmateName));
    }

    for (const quad of inputDataset) {
      combinedInputDataset.add(quad);
    }
    logger.debug("added %d quads from %s", inputDataset.size, inputDirentPath);
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
