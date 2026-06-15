import dataFactory from "@rdfx/data-factory";
import { skos } from "@tpluscode/rdf-ns-builders";
import { describe, it } from "vitest";
import { builder } from "../src/builder.js";

describe("builder", () => {
  describe("constructor", () => {
    it("with namespace", ({ expect }) => {
      expect(
        builder({ namespace: skos })
          .sh.PropertyShape("Concept", {
            cardinality: "set",
          })
          .$identifier()
          .equals(skos.Concept),
      ).toStrictEqual(true);
    });

    it("without namespace", ({ expect }) => {
      expect(
        builder()
          .sh.PropertyShape("http://example.com", { cardinality: "set" })
          .$identifier()
          .equals(dataFactory.namedNode("http://example.com")),
      ).toStrictEqual(true);
    });
  });
});
