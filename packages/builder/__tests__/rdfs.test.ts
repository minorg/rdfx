import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import { exTbox } from "./namespaces.js";
import "@rdfx/testing";
import dataFactory from "@rdfx/data-factory";
import { testRdfsResource } from "./testRdfsResource.js";

describe("rdfs", () => {
  const rdfs = builder({ defaultNamespace: exTbox }).rdfs;

  describe("Class", () => {
    testRdfsResource(rdfs.Class);

    describe("$identifier", () => {
      it("string", ({ expect }) => {
        expect(rdfs.Class("Class").$identifier()).toEqualRdfTerm(exTbox.Class);
      });

      it("IRI", ({ expect }) => {
        expect(rdfs.Class(exTbox.Class).$identifier()).toEqualRdfTerm(
          exTbox.Class,
        );
      });
    });

    describe("subClassOf", () => {
      it("string", ({ expect }) => {
        const expected = dataFactory.namedNode(`${exTbox[""].value}Class`);
        expect(
          rdfs.Class(dataFactory.namedNode("http://example.com/SubClass"), {
            subClassOf: "Class",
          }).subClassOf,
        ).toEqualRdfTermArray([expected]);
      });

      it("string array", ({ expect }) => {
        const expected = [dataFactory.namedNode(`${exTbox[""].value}Class`)];
        expect(
          rdfs.Class(dataFactory.namedNode("http://example.com/SubClass"), {
            subClassOf: ["Class"],
          }).subClassOf,
        ).toEqualRdfTermArray(expected);
      });

      it("IRI", ({ expect }) => {
        const expected = dataFactory.namedNode(`http://example.com/SuperClass`);
        expect(
          rdfs.Class("Class", { subClassOf: expected }).subClassOf,
        ).toEqualRdfTermArray([expected]);
      });

      it("IRI array", ({ expect }) => {
        const expected = [
          dataFactory.namedNode(`http://example.com/SuperClass1`),
          dataFactory.namedNode(`http://example.com/SuperClass2`),
        ];
        expect(
          rdfs.Class("Class", { subClassOf: expected }).subClassOf,
        ).toEqualRdfTermArray(expected);
      });
    });
  });
});
