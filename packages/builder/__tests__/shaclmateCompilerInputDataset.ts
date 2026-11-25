import path from "node:path";
import url from "node:url";
import { datasetFactory } from "@rdfx/collection";
import { RdfFile } from "@rdfx/fs";

export const shaclmateCompilerInputDataset = datasetFactory.dataset();

const thisDirectoryPath = path.dirname(url.fileURLToPath(import.meta.url));
const rootDirectoryPath = path.resolve(
  path.join(thisDirectoryPath, "..", "..", ".."),
);
const ttlFilePath = path.join(
  rootDirectoryPath,
  "node_modules",
  "@shaclmate",
  "compiler",
  "dist",
  "input",
  "input.shaclmate.ttl",
);
(
  await RdfFile.fromPath(ttlFilePath)
    .unsafeCoerce()
    .parseInto(shaclmateCompilerInputDataset)
).unsafeCoerce();
