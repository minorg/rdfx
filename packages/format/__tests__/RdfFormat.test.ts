import { describe, it } from "vitest";
import { RdfFormat } from "../src/RdfFormat.js";
import { uncompressedRdfFormatsByMimeType } from "../src/uncompressedRdfFormatsByMimeType.js";
import "@rdfx/testing";

describe("RdfFormat", () => {
  describe("fromFileName", () => {
    const testCases: readonly [string, RdfFormat | null][] = [
      ["test.ttl", uncompressedRdfFormatsByMimeType["text/turtle"]],
      ["test.shaclmate.ttl", uncompressedRdfFormatsByMimeType["text/turtle"]],
      [
        "test.ttl.gz",
        {
          ...uncompressedRdfFormatsByMimeType["text/turtle"],
          mimeType: "application/gzip",
          uncompressedMimeType: "text/turtle",
        },
      ],
      [
        "test.shaclmate.ttl.gz",
        {
          ...uncompressedRdfFormatsByMimeType["text/turtle"],
          mimeType: "application/gzip",
          uncompressedMimeType: "text/turtle",
        },
      ],
    ];

    for (const [fileName, expectedRdfFormat] of testCases) {
      it(fileName, ({ expect }) => {
        const actualRdfFormat = RdfFormat.fromFileName(fileName).extract();
        if (expectedRdfFormat === null) {
          expect(actualRdfFormat).toBeInstanceOf(Error);
          return;
        }
        if (actualRdfFormat instanceof Error) {
          throw expectedRdfFormat;
        }
        expect(actualRdfFormat.mimeType).toStrictEqual(
          expectedRdfFormat.mimeType,
        );
        if ("uncompressedMimeType" in expectedRdfFormat) {
          if (!("uncompressedMimeType" in actualRdfFormat)) {
            throw new Error("RDF format mismatch");
          }
          expect(actualRdfFormat.uncompressedMimeType).toStrictEqual(
            expectedRdfFormat.uncompressedMimeType,
          );
        }
      });
    }
  });

  it("isCompressed", ({ expect }) => {
    expect(
      RdfFormat.isCompressed({
        ...uncompressedRdfFormatsByMimeType["text/turtle"],
        mimeType: "application/gzip",
        uncompressedMimeType: "text/turtle",
      }),
    ).toStrictEqual(true);
    expect(
      RdfFormat.isCompressed(uncompressedRdfFormatsByMimeType["text/turtle"]),
    ).toStrictEqual(false);
  });
});
