import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RdfFormat } from "@rdfx/format";
import { DataFactory as dataFactory } from "n3";
import { describe, it } from "vitest";
import { parse } from "../src/parse.js";
import { parseSync } from "../src/parseSync.js";

const testDataDirPath = path.resolve(
  path.join(__dirname),
  "..",
  "..",
  "..",
  "test-data",
);

describe("parse", async () => {
  for (const dirent of await readdir(testDataDirPath, {
    withFileTypes: true,
  })) {
    if (!dirent.isFile()) {
      continue;
    }
    if (dirent.name === "README.md") {
      continue;
    }
    const rdfFormat = RdfFormat.fromFileName(dirent.name).unsafeCoerce();
    if (RdfFormat.isCompressed(rdfFormat)) {
      continue;
    }

    const filePath = path.join(dirent.parentPath, dirent.name);

    const input = (await readFile(filePath)).toString();
    const expectedQuadCount =
      path.basename(dirent.name) === "unesco-thesaurus" ? 5 : undefined;

    describe(dirent.name, () => {
      it("parse (with format)", async ({ expect }) => {
        const actualQuads = (
          await parse(input, {
            dataFactory,
            format: rdfFormat.mimeType,
          })
        ).unsafeCoerce();
        expect(actualQuads).not.toHaveLength(0);
        if (expectedQuadCount !== undefined) {
          expect(actualQuads).toHaveLength(expectedQuadCount);
        }
      });

      it("parse (without format)", async ({ expect }) => {
        if (rdfFormat.mimeType === "application/ld+json") {
          return;
        }
        const actualQuads = (
          await parse(input, {
            dataFactory,
            format: rdfFormat.mimeType,
          })
        ).unsafeCoerce();
        expect(actualQuads).not.toHaveLength(0);
        if (expectedQuadCount !== undefined) {
          expect(actualQuads).toHaveLength(expectedQuadCount);
        }
      });

      it("parseSync", ({ expect }) => {
        if (rdfFormat.mimeType === "application/ld+json") {
          return;
        }
        const actualQuads = parseSync(input, {
          dataFactory,
        }).unsafeCoerce();
        expect(actualQuads).not.toHaveLength(0);
        if (expectedQuadCount !== undefined) {
          expect(actualQuads).toHaveLength(expectedQuadCount);
        }
      });
    });
  }
});
