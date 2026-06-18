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
    const expectedQuad = dataFactory.quad(
      dataFactory.namedNode("http://example.com/subject"),
      dataFactory.namedNode("http://example.com/predicate"),
      dataFactory.namedNode("http://example.com/object"),
      dataFactory.namedNode("http://example.com/graph"),
    );
    const prefixes = new PrefixMap(
      [["ex", dataFactory.namedNode("http://example.com/")]],
      { factory: dataFactory },
    );

    async function testSerialize(format: RdfFile.Format): Promise<void> {
      await using tempDir = await fs.mkdtempDisposable(
        path.join(os.tmpdir(), "rdfx-"),
      );
      const tempFilePath = path.join(tempDir.path, "file.tmp");
      const tempFile = new RdfFile(tempFilePath, { format });

      switch (format.rdfFormat) {
        case "application/ld+json":
        case "application/n-quads":
        case "application/trig":
        case "application/rdf+xml":
        case "text/n3": {
          const expectedDataset = datasetFactory.dataset([expectedQuad]);
          (
            await tempFile.serialize(expectedDataset, {
              prefixes,
            })
          ).unsafeCoerce();
          const actualDataset = (
            await tempFile.parseInto(datasetFactory.dataset())
          ).unsafeCoerce();
          expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
          break;
        }
        case "application/n-triples":
        case "text/turtle": {
          const expectedTriple = dataFactory.quad(
            expectedQuad.subject,
            expectedQuad.predicate,
            expectedQuad.object,
          );
          (
            await tempFile.serialize(datasetFactory.dataset([expectedTriple]), {
              prefixes,
            })
          ).unsafeCoerce();
          // const actualSerializedText = (
          //   await fs.readFile(tempFile.path)
          // ).toString();
          const actualDataset = (
            await tempFile.parseInto(datasetFactory.dataset())
          ).unsafeCoerce();
          expect(actualDataset).toBeRdfDatasetOfSize(1);
          const actualTriple = [...actualDataset][0];
          expect(actualTriple).toEqualRdfQuad(expectedTriple);
        }
      }
    }

    it("n3", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "text/n3",
      }));

    it("nq", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "application/n-quads",
      }));

    // it("nq.gz", () =>
    //   testSerialize({
    //     compressionMethod: Maybe.of("application/gzip"),
    //     rdfFormat: "application/n-quads",
    //   }));

    it("nt", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "application/n-triples",
      }));

    it("trig", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "application/trig",
      }));

    it("ttl", () =>
      testSerialize({
        compressionMethod: Maybe.empty(),
        rdfFormat: "text/turtle",
      }));

    // it("ttl.gz", () =>
    //   testSerialize({
    //     compressionMethod: Maybe.of("application/gzip"),
    //     rdfFormat: "text/turtle",
    //   }));
  });
});
