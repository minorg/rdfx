import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import { exTbox } from "./namespaces.js";
import "@rdfx/testing";
import { testRdfsResource } from "./testRdfsResource.js";

describe("rdf", () => {
  const rdf = builder({ defaultNamespace: exTbox }).rdf;

  describe("Property", () => {
    testRdfsResource(rdf.Property);

    describe("$identifier", () => {
      it("string", ({ expect }) => {
        expect(rdf.Property("Property").$identifier()).toEqualRdfTerm(
          exTbox.Property,
        );
      });

      it("IRI", ({ expect }) => {
        expect(rdf.Property(exTbox.Property).$identifier()).toEqualRdfTerm(
          exTbox.Property,
        );
      });
    });
  });
});
