import path from "node:path";
import { fileURLToPath } from "node:url";

export const testDataDirectoryPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "test-data",
);
