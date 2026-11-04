import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Worksheet } from "../src/Worksheet.js";

export function snapshotsDirectoryPath(
  workbookFileName: string,
  worksheet?: Worksheet,
) {
  let snapshotsDirectoryPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "__snapshots__",
    workbookFileName,
  );
  if (worksheet) {
    snapshotsDirectoryPath = path.join(
      snapshotsDirectoryPath,
      "worksheets",
      worksheet.name,
    );
  }
  return snapshotsDirectoryPath;
}

export const testDataDirectoryPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "test-data",
);
