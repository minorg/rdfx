import dataFactory from "@rdfx/data-factory";
import { skos } from "@tpluscode/rdf-ns-builders";
import { describe, it } from "vitest";
import { builder } from "../src/builder.js";

describe("builder", () => {
  describe("constructor", () => {
    it("with namespace", ({ expect }) => {
      expect(
        builder({ namespace: skos })("broader").equals(skos.broader),
      ).toStrictEqual(true);
    });

    it("without namespace", ({ expect }) => {
      expect(
        builder()("http://example.com").equals(
          dataFactory.namedNode("http://example.com"),
        ),
      ).toStrictEqual(true);
    });
  });
});
