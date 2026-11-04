import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { convert as convertCallback } from "libreoffice-convert";
import { Workbook } from "../src/Workbook.js";
import { testDataDirectoryPath } from "./paths.js";

const convert = promisify(convertCallback);

export async function readTestWorkbook(fileName: string): Promise<Workbook> {
  const filePath = path.join(testDataDirectoryPath, fileName);
  if (fileName.endsWith(".xls")) {
    return Workbook.read(
      await convert(
        Buffer.from(await fs.readFile(filePath)),
        "xlsx",
        undefined,
      ),
    ).unsafeCoerce();
  } else {
    return Workbook.read(await fs.readFile(filePath)).unsafeCoerce();
  }
}
