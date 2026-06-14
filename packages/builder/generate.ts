#!/usr/bin/env npm exec tsx --

import { exec as execCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { promisify } from "node:util";
import datasetFactory from "@rdfjs/dataset";
import dataFactory from "@rdfx/data-factory";
import { RdfDirectory } from "@rdfx/fs";
import { ResourceSet } from "@rdfx/resource";
import * as shaclmateCli from "@shaclmate/cli";
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
  const dataset = datasetFactory.dataset();

  const inputDirectory = new RdfDirectory(
    path.join(thisDirectoryPath, "shapes"),
    { logger },
  );

  for await (const inputFile of inputDirectory.files()) {
  }

  const resourceSet = new ResourceSet({ dataFactory, dataset });
  for (const resource of resourceSet.instancesOf(sh.NodeShape)) {
    const currentShaclmateName = resource
      .value(shaclmate.name)
      .chain((_) => _.toString())
      .unsafeCoerce();
    const newShaclmateName =
  }

  const output = ShapesGraph.builder()
    .parseDataset(dataset, { prefixMap })
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
