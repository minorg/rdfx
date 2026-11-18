import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import { createJsonLdRowSerializer } from "../src/createJsonLdRowSerializer.js";
import { NodeShape2 } from "./xlsx-test-shapes.shaclmate.js";

describe("createJsonLdRowSerializer", () => {
  it("NodeShape2", ({ expect }) => {
    const row: any = createJsonLdRowSerializer(NodeShape2)(
      NodeShape2.createUnsafe({
        label: [
          dataFactory.literal("entest", "en"),
          dataFactory.literal("frtest", "fr"),
        ],
      }),
    );
    expect(Array.isArray(row)).toStrictEqual(false);
    expect(Object.keys(row)).toHaveLength(3);
    expect(row["@id"].startsWith("_:")).toStrictEqual(true);
    expect(row["label@en"]).toStrictEqual("entest");
    expect(row["label@fr"]).toStrictEqual("frtest");
  });
});
