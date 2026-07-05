import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import type { Literal } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import type { skos_Concept } from "../src/shapes.js";
import { exCbox } from "./namespaces.js";

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe("skos", () => {
  const skos = builder({ namespace: exCbox }).skos;

  describe("Concept", () => {
    describe("$identifier", () => {
      it("string", ({ expect }) => {
        expect(skos.Concept("TopConcept").$identifier()).toEqualRdfTerm(
          exCbox.TopConcept,
        );
      });

      it("IRI", ({ expect }) => {
        expect(skos.Concept(exCbox.TopConcept).$identifier()).toEqualRdfTerm(
          exCbox.TopConcept,
        );
      });
    });

    describe("broader", () => {
      it("string", ({ expect }) => {
        expect(
          skos.Concept("LeafConcept", { broader: "TopConcept" }).broader,
        ).toEqualRdfTermArray([exCbox.TopConcept]);
      });

      it("IRI", ({ expect }) => {
        expect(
          skos.Concept("LeafConcept", { broader: exCbox.TopConcept }).broader,
        ).toEqualRdfTermArray([exCbox.TopConcept]);
      });
    });
  });

  describe("ConceptScheme", () => {
    describe("concepts", () => {
      it("key as identifier", ({ expect }) => {
        const conceptScheme = skos.ConceptScheme("ConceptScheme", {
          concepts: {
            Test: {
              prefLabel: "test",
            },
          },
        });
        expect(conceptScheme.concepts).toHaveLength(1);
        expect(conceptScheme.concepts[0].termType).toStrictEqual(
          "skos_Concept",
        );
        expect(
          (conceptScheme.concepts[0] as skos_Concept).$identifier(),
        ).toEqualRdfTerm((exCbox as any)["ConceptScheme_Test"]);
      });

      it("ignore key when $identifier specified", ({ expect }) => {
        const conceptScheme = skos.ConceptScheme("ConceptScheme", {
          concepts: {
            Test: {
              $identifier: exCbox.LeafConcept,
              prefLabel: "test",
            },
          },
        });
        expect(conceptScheme.concepts).toHaveLength(1);
        expect(conceptScheme.concepts[0].termType).toStrictEqual(
          "skos_Concept",
        );
        expect(
          (conceptScheme.concepts[0] as skos_Concept).$identifier(),
        ).toEqualRdfTerm(exCbox.LeafConcept);
      });

      it("key as broader", ({ expect }) => {
        const conceptScheme = skos.ConceptScheme("ConceptScheme", {
          concepts: {
            TestTopConcept: {},
            TestLeaf: {
              broader: "TestTopConcept",
            },
          } as const,
        });
        expect(conceptScheme.concepts).toHaveLength(2);
        expect(conceptScheme.topConcepts).toHaveLength(1);
        const leafConcept = conceptScheme.concepts.find(
          (concept) =>
            concept.termType === "skos_Concept" && concept.broader.length === 1,
        )! as skos_Concept;
        expect(leafConcept).toBeDefined();
        expect(leafConcept.broader).toEqualRdfTermArray([
          dataFactory.namedNode(
            `${conceptScheme.$identifier().value}_TestTopConcept`,
          ),
        ]);
      });

      it("key as notation", ({ expect }) => {
        const conceptScheme = skos.ConceptScheme("ConceptScheme", {
          concepts: {
            Test: {
              notation: true,
            },
          },
        });
        expect(conceptScheme.concepts).toHaveLength(1);
        expect(conceptScheme.concepts[0].termType).toStrictEqual(
          "skos_Concept",
        );
        expect(
          (conceptScheme.concepts[0] as skos_Concept).notation,
        ).toEqualRdfTermArray([dataFactory.literal("Test")]);
      });
    });
  });

  describe("Resource", () => {
    for (const labelPropertyName of [
      "altLabel",
      "hiddenLabel",
      "prefLabel",
    ] as const) {
      describe(labelPropertyName, () => {
        function labelProperty(
          value: Literal | string | readonly (Literal | string)[],
        ) {
          const result: Mutable<Parameters<typeof skos.Concept>[1]> = {};
          result[labelPropertyName] = value;
          return result;
        }

        it("string", ({ expect }) => {
          expect(
            skos.Concept("TopConcept", labelProperty("test"))[
              labelPropertyName
            ],
          ).toEqual(["test"]);
        });

        it("Literal", ({ expect }) => {
          expect(
            skos.Concept(
              "TopConcept",
              labelProperty(dataFactory.literal("test")),
            )[labelPropertyName],
          ).toEqualRdfTermArray([dataFactory.literal("test")]);
        });

        it("[Literal, string]", ({ expect }) => {
          expect(
            skos.Concept(
              "TopConcept",
              labelProperty([dataFactory.literal("test1"), "test2"]),
            )[labelPropertyName],
          ).toHaveLength(2);
        });
      });

      describe("notation", () => {
        it("Literal", ({ expect }) => {
          expect(
            skos.Concept("TopConcept", {
              notation: dataFactory.literal("test"),
            }).notation,
          ).toEqualRdfTermArray([dataFactory.literal("test")]);
        });
      });
    }
  });
});
