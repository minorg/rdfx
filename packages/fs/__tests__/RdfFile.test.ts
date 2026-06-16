import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import datasetFactory from "@rdfjs/dataset";
import PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import dataFactory from "@rdfx/data-factory";
import { describe, expect, it } from "vitest";
import { RdfFile } from "../src/RdfFile.js";
import { testDataDirPath } from "./paths.js";
import "@rdfx/testing";
import { Maybe } from "purify-ts";

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
    for (const fileName of await fs.readdir(testDataDirPath)) {
      const rdfFilePath = path.resolve(testDataDirPath, fileName);
      if (fileName.startsWith("unesco-thesaurus")) {
        it(`should parse ${fileName}`, async ({ expect }) => {
          const prefixMap = new PrefixMap(undefined, { factory: dataFactory });
          const dataset = (
            await RdfFile.fromPath(rdfFilePath)
              .unsafeCoerce()
              .parseInto(datasetFactory.dataset(), { prefixMap })
          ).unsafeCoerce();
          expect(dataset.size).toBe(88482);
          if (fileName.endsWith(".ttl")) {
            expect(prefixMap.size).toBe(1);
          }
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

  describe("serialize", async () => {
    const expectedDataset = datasetFactory.dataset();
    const expectedQuad = dataFactory.quad(
      dataFactory.namedNode("http://example.com/subject"),
      dataFactory.namedNode("http://example.com/predicate"),
      dataFactory.namedNode("http://example.com/object"),
      dataFactory.namedNode("http://example.com/graph"),
    );
    expectedDataset.add(expectedQuad);

    async function testSerialize(format: RdfFile.Format): Promise<void> {
      await using tempDir = await fs.mkdtempDisposable(
        path.join(os.tmpdir(), "rdfx-"),
      );
      const tempFilePath = path.join(tempDir.path, "file.tmp");
      const tempFile = new RdfFile(tempFilePath, { format });

      (await tempFile.serialize(expectedDataset)).unsafeCoerce();

      const actualDataset = datasetFactory.dataset();
      (await tempFile.parseInto(actualDataset)).unsafeCoerce();
      switch (format.rdfFormat) {
        case "application/ld+json":
        case "application/n-quads":
        case "application/trig":
        case "application/rdf+xml":
          expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
          break;
        case "application/n-triples":
        case "text/n3":
        case "text/turtle": {
          expect(actualDataset).toBeRdfDatasetOfSize(1);
          const actualQuad = [...actualDataset][0];
          expect(actualQuad).toEqualRdfQuad(
            dataFactory.quad(
              expectedQuad.subject,
              expectedQuad.predicate,
              expectedQuad.object,
            ),
          );
        }
      }
    }

    it("nq", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "application/n-quads",
      }));

    it("nq.gz", () =>
      testSerialize({
        compressionMethod: Maybe.of("application/gzip"),
        rdfFormat: "application/n-quads",
      }));

    it("ttl", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "text/turtle",
      }));

    it("ttl.gz", () =>
      testSerialize({
        compressionMethod: Maybe.of("application/gzip"),
        rdfFormat: "text/turtle",
      }));
  });
});
