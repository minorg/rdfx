import { uncompressedRdfFormats } from "@rdfx/format";
import { DataFactory as dataFactory } from "n3";
import { describe, it } from "vitest";
import { serialize } from "../src/serialize.js";
import { serializeSync } from "../src/serializeSync.js";

describe("serialize", async () => {
  const quads = Array.from({ length: 10 }).map((_, i) =>
    dataFactory.quad(
      dataFactory.namedNode(`http://example.com/subject${i}`),
      dataFactory.namedNode(`http://example.com/predicate${i}`),
      dataFactory.namedNode(`http://example.com/object${i}`),
      dataFactory.namedNode(`http://example.com/graph${i}`),
    ),
  );

  for (const rdfFormat of uncompressedRdfFormats) {
    it("serialize", async ({ expect }) => {
      const output = (
        await serialize(quads, {
          format: rdfFormat.mimeType,
        })
      ).unsafeCoerce();
      expect(output).not.toHaveLength(0);
    });

    it("serializeSync", async ({ expect }) => {
      switch (rdfFormat.mimeType) {
        case "application/n-quads":
        case "application/n-triples":
        case "text/turtle":
          break;
        default:
          return;
      }

      const output = serializeSync(quads, {
        format: rdfFormat.mimeType,
      }).unsafeCoerce();
      expect(output).not.toHaveLength(0);
    });
  }
});
