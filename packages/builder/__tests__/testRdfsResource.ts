import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import {
  owl_Ontology,
  type rdf_Property,
  type rdfs_Class,
} from "../src/shapes.js";

export function testRdfsResource(
  rdfsResourceFactory: (
    $identifier: NamedNode,
    options?: Pick<
      Parameters<typeof rdfs_Class.createUnsafe>[0],
      "comment" | "isDefinedBy" | "label" | "seeAlso"
    >,
  ) => rdfs_Class | rdf_Property,
) {
  const $identifier = dataFactory.namedNode("http://example.com/test");

  describe("comment", () => {
    it("string", ({ expect }) => {
      expect(
        rdfsResourceFactory($identifier, { comment: "test" }).comment,
      ).toEqualRdfTermArray([dataFactory.literal("test")]);
    });

    it("string array", ({ expect }) => {
      expect(
        rdfsResourceFactory($identifier, { comment: ["test1", "test2"] })
          .comment,
      ).toEqualRdfTermArray([
        dataFactory.literal("test1"),
        dataFactory.literal("test2"),
      ]);
    });

    it("lang string array", ({ expect }) => {
      const expected = [
        dataFactory.literal("encomment", "en"),
        dataFactory.literal("frcomment", "fr"),
      ];

      expect(
        rdfsResourceFactory($identifier, { comment: expected }).comment,
      ).toEqualRdfTermArray(expected);
    });
  });

  describe("isDefinedBy", () => {
    it("unspecified", ({ expect }) => {
      expect(
        rdfsResourceFactory($identifier, {}).isDefinedBy.extract(),
      ).toBeUndefined();
    });

    it("IRI", ({ expect }) => {
      const expected = dataFactory.namedNode("http://example/ontology");
      expect(
        rdfsResourceFactory($identifier, {
          isDefinedBy: expected,
        }).isDefinedBy.extract(),
      ).toEqualRdfTerm(expected);
    });

    it("Ontology", ({ expect }) => {
      const expected = owl_Ontology.createUnsafe({
        $identifier: dataFactory.namedNode("http://example/ontology"),
      });
      const actual = rdfsResourceFactory($identifier, {
        isDefinedBy: expected,
      }).isDefinedBy.extract();
      expect(actual?.termType).toStrictEqual("owl_Ontology");
      expect((actual! as owl_Ontology).$identifier()).toStrictEqual(
        expected.$identifier(),
      );
    });
  });

  describe("label", () => {
    it("string", ({ expect }) => {
      expect(
        rdfsResourceFactory($identifier, { label: "test" }).label,
      ).toEqualRdfTermArray([dataFactory.literal("test")]);
    });

    it("string array", ({ expect }) => {
      expect(
        rdfsResourceFactory($identifier, { label: ["test1", "test2"] }).label,
      ).toEqualRdfTermArray([
        dataFactory.literal("test1"),
        dataFactory.literal("test2"),
      ]);
    });

    it("lang string array", ({ expect }) => {
      const expected = [
        dataFactory.literal("enlabel", "en"),
        dataFactory.literal("frlabel", "fr"),
      ];

      expect(
        rdfsResourceFactory($identifier, { label: expected }).label,
      ).toEqualRdfTermArray(expected);
    });
  });

  describe("seeAlso", () => {
    it("Literal", ({ expect }) => {
      const expected = dataFactory.literal("test");
      expect(
        rdfsResourceFactory($identifier, {
          seeAlso: expected,
        }).seeAlso,
      ).toEqualRdfTermArray([expected]);
    });

    it("Literal array", ({ expect }) => {
      const expected = [
        dataFactory.literal("test1"),
        dataFactory.literal("test2"),
      ];
      expect(
        rdfsResourceFactory($identifier, {
          seeAlso: expected,
        }).seeAlso,
      ).toEqualRdfTermArray(expected);
    });

    it("IRI", ({ expect }) => {
      const expected = dataFactory.namedNode("http://example.com/1");
      expect(
        rdfsResourceFactory($identifier, {
          seeAlso: expected,
        }).seeAlso,
      ).toEqualRdfTermArray([expected]);
    });

    it("IRI array", ({ expect }) => {
      const expected = [
        dataFactory.namedNode("http://example.com/1"),
        dataFactory.namedNode("http://example.com/2"),
      ];
      expect(
        rdfsResourceFactory($identifier, {
          seeAlso: expected,
        }).seeAlso,
      ).toEqualRdfTermArray(expected);
    });
  });
}
