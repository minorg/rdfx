#!/usr/bin/env npm exec tsx --

import { exec as execCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { promisify } from "node:util";
import datasetFactory from "@rdfjs/dataset";
import PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import dataFactory from "@rdfx/data-factory";
import { RdfDirectory } from "@rdfx/fs";
import { ResourceSet } from "@rdfx/resource";
import { Compiler, ShapesGraph, TsGenerator } from "@shaclmate/compiler";
import { sh } from "@tpluscode/rdf-ns-builders";
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
  const prefixMap = new PrefixMap();

  const inputDirectory = new RdfDirectory(
    path.join(thisDirectoryPath, "shapes"),
    { logger },
  );
  const inputDirectoryDataset = datasetFactory.dataset();

  for await (const inputFile of inputDirectory.files()) {
    const inputFileDataset = (
      await inputDirectory.parseInto(datasetFactory.dataset(), { prefixMap })
    ).unsafeCoerce();

    for (const resource of new ResourceSet({
      dataFactory,
      dataset: inputFileDataset,
    }).instancesOf(sh.NodeShape)) {
      const currentShaclmateName = resource
        .value(shaclmate.name)
        .chain((_) => _.toString())
        .unsafeCoerce();
      const newShaclmateName = `${
        path
          .basename(inputFile.path, path.extname(inputFile.path))
          .split(".")[0]
      }_${currentShaclmateName}`;
      logger.debug(
        "renaming node shape %s to %s",
        currentShaclmateName,
        newShaclmateName,
      );
      resource.set(shaclmate.name, dataFactory.literal(newShaclmateName));
    }
  }

  const output = ShapesGraph.builder()
    .parseDataset(inputDirectoryDataset, { prefixMap })
    .map((_) => _.build())
    .chain((shapesGraph) =>
      new Compiler({
        generator: new TsGenerator({
          configuration: {
            features: new Set(["Object.toRdf"]),
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
