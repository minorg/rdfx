import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import { exCbox } from "./namespaces.js";

describe("skos", () => {
  const skos = builder({ namespace: exCbox }).skos;

  describe("Concept", () => {
    describe("identifier", () => {
      it("string", () => {
        skos.Concept(exCbox.TopConcept, { prefLabel: "test" });
      });
    });
  });
});
