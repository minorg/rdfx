import { describe, it } from "vitest";
import { builder } from "../src/builder.js";
import "@rdfx/testing";
import type { Literal } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { rdf, skos as skosNs } from "@tpluscode/rdf-ns-builders";
import { skos_Concept } from "../src/shapes.js";
import { exCbox, exTbox } from "./namespaces.js";
import "@rdfx/testing";

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

        it("unspecified", ({ expect }) => {
          const concept = skos.Concept("TopConcept");
          if (labelPropertyName === "prefLabel") {
            expect(concept[labelPropertyName]).toEqual(["Top concept"]);
          } else {
            expect(concept[labelPropertyName]).toHaveLength(0);
          }
        });

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

      describe("definition", () => {
        it("Literal", ({ expect }) => {
          expect(
            skos.Concept("TopConcept", {
              definition: dataFactory.literal("test"),
            }).definition,
          ).toEqualRdfTermArray([dataFactory.literal("test")]);
        });

        it("string", ({ expect }) => {
          expect(
            skos.Concept("TopConcept", {
              definition: "test",
            }).definition,
          ).toEqual(["test"]);
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

      describe("type", () => {
        it("unspecified", ({ expect }) => {
          const concept = skos.Concept("TopConcept");
          expect(concept.type).toHaveLength(0);
          expect(
            skos_Concept.toRdfResource(concept).dataset,
          ).toBeRdfDatasetContaining(
            dataFactory.quad(
              concept.$identifier(),
              rdf.type,
              skosNs.Concept,
              dataFactory.defaultGraph(),
            ),
          );
        });

        it("skos:Concept", ({ expect }) => {
          const concept = skos.Concept("TopConcept", { type: skosNs.Concept });
          expect(concept.type).toHaveLength(1);
          expect(
            skos_Concept.toRdfResource(concept).dataset,
          ).toBeRdfDatasetContaining(
            dataFactory.quad(
              concept.$identifier(),
              rdf.type,
              skosNs.Concept,
              dataFactory.defaultGraph(),
            ),
          );
        });

        it("skos:Concept and ex:Class", ({ expect }) => {
          const concept = skos.Concept("TopConcept", { type: exTbox.Class });
          expect(concept.type).toHaveLength(1);
          expect(
            skos_Concept.toRdfResource(concept).dataset,
          ).toBeRdfDatasetContaining(
            dataFactory.quad(
              concept.$identifier(),
              rdf.type,
              skosNs.Concept,
              dataFactory.defaultGraph(),
            ),
            dataFactory.quad(
              concept.$identifier(),
              rdf.type,
              exTbox.Class,
              dataFactory.defaultGraph(),
            ),
          );
        });
      });
    }
  });
});
