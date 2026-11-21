import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import { exTbox } from "./namespaces.js";
import "@rdfx/testing";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { Mutable } from "./Mutable.js";
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

    for (const domainRangePropertyName of ["domain", "range"] as const) {
      describe(domainRangePropertyName, () => {
        function domainRangeProperty(...values: readonly NamedNode[]) {
          const result: Mutable<Parameters<typeof rdf.Property>[1]> = {};
          result[domainRangePropertyName] = values;
          return result;
        }

        it("IRI", ({ expect }) => {
          const expected = dataFactory.namedNode(
            `http://example.com/${domainRangePropertyName}`,
          );
          expect(
            rdf.Property("Property", domainRangeProperty(expected))[
              domainRangePropertyName
            ],
          ).toEqualRdfTermArray([expected]);
        });

        it("IRI array", ({ expect }) => {
          const expected = [
            dataFactory.namedNode(
              `http://example.com/${domainRangePropertyName}1`,
            ),
            dataFactory.namedNode(
              `http://example.com/${domainRangePropertyName}2`,
            ),
          ];
          expect(
            rdf.Property("Property", domainRangeProperty(...expected))[
              domainRangePropertyName
            ],
          ).toEqualRdfTermArray(expected);
        });
      });
    }

    describe("subPropertyOf", () => {
      it("string", ({ expect }) => {
        const expected = dataFactory.namedNode(`${exTbox[""].value}Property`);
        expect(
          rdf.Property(
            dataFactory.namedNode("http://example.com/SubProperty"),
            { subPropertyOf: "Property" },
          ).subPropertyOf,
        ).toEqualRdfTermArray([expected]);
      });

      it("string array", ({ expect }) => {
        const expected = [dataFactory.namedNode(`${exTbox[""].value}Property`)];
        expect(
          rdf.Property(
            dataFactory.namedNode("http://example.com/SubProperty"),
            { subPropertyOf: ["Property"] },
          ).subPropertyOf,
        ).toEqualRdfTermArray(expected);
      });

      it("IRI", ({ expect }) => {
        const expected = dataFactory.namedNode(
          `http://example.com/SuperProperty`,
        );
        expect(
          rdf.Property("Property", { subPropertyOf: expected }).subPropertyOf,
        ).toEqualRdfTermArray([expected]);
      });

      it("IRI array", ({ expect }) => {
        const expected = [
          dataFactory.namedNode(`http://example.com/SuperProperty1`),
          dataFactory.namedNode(`http://example.com/SuperProperty2`),
        ];
        expect(
          rdf.Property("Property", { subPropertyOf: expected }).subPropertyOf,
        ).toEqualRdfTermArray(expected);
      });
    });
  });
});
