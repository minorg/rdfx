import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import datasetFactory from "@rdfjs/dataset";
import { describe, it } from "vitest";
import { RdfFile } from "../src/RdfFile.js";

describe("RdfFile", () => {
  describe("fromPath", () => {
    for (const rdfFileName of ["test.jsonld", "test.nt", "test.nt.br"]) {
      it(`should recognize ${rdfFileName} has an RDF file extension`, ({
        expect,
      }) => {
        expect(
          RdfFile.fromPath(rdfFileName).toMaybe().extractNullable(),
        ).not.toBeNull();
      });
    }

    for (const rdfFileName of ["test.json", "test.nt.whatever", "test.doc"]) {
      it(`should recognize ${rdfFileName} does not have RDF file extension`, ({
        expect,
      }) => {
        expect(
          RdfFile.fromPath(rdfFileName).toMaybe().extractNullable(),
        ).toBeNull();
      });
    }
  });

  describe("parse", async () => {
    const testDataDirPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "data",
    );
    for (const fileName of await fs.promises.readdir(testDataDirPath)) {
      const rdfFilePath = path.resolve(testDataDirPath, fileName);
      if (fileName.startsWith("unesco-thesaurus")) {
        it(`should parse ${fileName}`, async ({ expect }) => {
          const dataset = (
            await RdfFile.fromPath(rdfFilePath)
              .unsafeCoerce()
              .parseInto(datasetFactory.dataset())
          ).unsafeCoerce();
          expect(dataset.size).toBe(88482);
        }, 10000);
      } else if (fileName === "place.jsonld") {
        it(`should parse ${fileName}`, async ({ expect }) => {
          const dataset = (
            await RdfFile.fromPath(rdfFilePath)
              .unsafeCoerce()
              .parseInto(datasetFactory.dataset())
          ).unsafeCoerce();
          expect(dataset.size).toBe(6);
        });
      }
    }
  });
});
