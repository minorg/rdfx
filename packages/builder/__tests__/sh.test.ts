import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { ShapesGraph } from "@shaclmate/compiler";
import { shaclShaclDataset, ZazukoValidator } from "@shaclmate/validator";
import { describe, expect, it } from "vitest";
import { builder } from "../src/builder.js";
import { type sh_PropertyShape, sh_Shape } from "../src/shapes.js";
import "@rdfx/testing";
import type { NamespaceBuilder } from "@rdfx/iri";
import { owl, rdfs } from "@tpluscode/rdf-ns-builders";
import { exCbox, exTbox } from "./namespaces.js";
import { shaclmateCompilerInputDataset } from "./shaclmateCompilerInputDataset.js";

describe("sh", () => {
  const { sh } = builder({ defaultNamespace: exTbox });

  const shaclShaclValidator = new ZazukoValidator({
    shapesGraph: shaclShaclDataset,
  });
  const shaclmateCompilerInputValidator = new ZazukoValidator({
    shapesGraph: shaclmateCompilerInputDataset,
  });

  const conceptScheme = builder({
    defaultNamespace: exCbox,
  }).skos.ConceptScheme("ConceptScheme", {
    concepts: {
      LeafConcept: {
        $identifier: exCbox.LeafConcept,
      },
      TopConcept: {
        $identifier: exCbox.TopConcept,
      },
    },
  });

  async function expectValidShapes(
    ...shapes: readonly sh_Shape[]
  ): Promise<void> {
    expect(shapes).not.toHaveLength(0);
    const shapesGraphResourceSet = new ResourceSet({
      dataFactory,
      dataset: datasetFactory.dataset(),
    });
    for (const shape of shapes) {
      sh_Shape.toRdfResource(shape, { resourceSet: shapesGraphResourceSet });
    }

    expect(shaclShaclDataset.size).toBeGreaterThan(0);
    expect(
      (
        await shaclShaclValidator.validate(shapesGraphResourceSet.dataset)
      ).unsafeCoerce().conforms,
    ).toStrictEqual(true);

    expect(shaclmateCompilerInputDataset.size).toBeGreaterThan(0);
    expect(
      (
        await shaclmateCompilerInputValidator.validate(
          shapesGraphResourceSet.dataset,
        )
      ).unsafeCoerce().conforms,
    ).toStrictEqual(true);

    const shapesGraph = ShapesGraph.fromDataset(
      shapesGraphResourceSet.dataset,
    ).unsafeCoerce();
    for (const shape of shapes) {
      shapesGraph.shape(shape.$identifier()).unsafeCoerce();
      // if (sh_NodeShape.issh_NodeShape(shape)) {
      //   expect(parsedShape.$type).toStrictEqual("NodeShape");
      // } else {
      //   expect(parsedShape.$type).toStrictEqual("PropertyShape");
      // }
    }
  }

  describe("NodeShape", () => {
    const propertyShape = sh.PropertyShape("property");

    describe.skip("$identifier", () => {
      it("blank node", async () => {
        const nodeShape = sh.NodeShape(dataFactory.blankNode());
        await expectValidShapes(nodeShape);
        expect(nodeShape.$identifier().termType).toStrictEqual("BlankNode");
      });

      it("IRI", async () => {
        const nodeShape = sh.NodeShape(exTbox.Class);
        await expectValidShapes(nodeShape);
        expect(nodeShape.$identifier()).toEqualRdfTerm(exTbox.Class);
      });

      it("string", async () => {
        const nodeShape = sh.NodeShape("Class");
        await expectValidShapes(nodeShape);
        expect(nodeShape.$identifier()).toEqualRdfTerm(exTbox.Class);
      });

      it("undefined", async () => {
        const nodeShape = sh.NodeShape(undefined);
        await expectValidShapes(nodeShape);
        expect(nodeShape.$identifier().termType).toStrictEqual("BlankNode");
      });
    });

    describe("implicitClassTarget", () => {
      it.skip("unspecified", async () => {
        const nodeShape = sh.NodeShape("Class");
        await expectValidShapes(nodeShape);
        expect(nodeShape.type).toHaveLength(0);
      });

      it.skip("true", async () => {
        const nodeShape = sh.NodeShape("Class", { implicitClassTarget: true });
        await expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([rdfs.Class]);
      });

      it("with other types", async () => {
        const nodeShape = sh.NodeShape("Class", {
          implicitClassTarget: true,
          type: [exTbox.XoneMember1],
        });
        await expectValidShapes(nodeShape);
        expect(
          nodeShape.type.some((type) => type.equals(rdfs.Class)),
        ).toStrictEqual(true);
        expect(
          nodeShape.type.some((type) => type.equals(exTbox.XoneMember1)),
        ).toStrictEqual(true);
      });
    });

    describe("in", () => {
      it.skip("unspecified", async () => {
        const nodeShape = sh.NodeShape("Class", {});
        await expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toBeUndefined();
      });

      it("primitive", async () => {
        const nodeShape = sh.NodeShape("Class", {
          in_: ["test"],
        });
        await expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          dataFactory.literal("test"),
        ]);
      });

      it("IRI", async () => {
        const nodeShape = sh.NodeShape("Class", { in_: [exCbox.LeafConcept] });
        await expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
        ]);
      });

      it("skos:ConceptScheme", async () => {
        const nodeShape = sh.NodeShape("Class", { in_: conceptScheme });
        await expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
          exCbox.TopConcept,
        ]);
      });
    });

    describe("properties", () => {
      it.skip("unspecified", async () => {
        const nodeShape = sh.NodeShape("Class", {});
        await expectValidShapes(nodeShape);
        expect(nodeShape.properties).toHaveLength(0);
      });

      it("[IRI]", async () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: [exTbox.property],
        });
        await expectValidShapes(nodeShape, propertyShape);
        expect(nodeShape.properties).toEqualRdfTermArray([exTbox.property]);
      });

      it("[string]", async () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: ["property"],
        });
        await expectValidShapes(nodeShape, propertyShape);
        expect(nodeShape.properties).toEqualRdfTermArray([exTbox.property]);
      });

      it("[PropertyShape]", async () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: [sh.PropertyShape("property")],
        });
        await expectValidShapes(nodeShape);
        expect(nodeShape.properties).toHaveLength(1);
        expect(nodeShape.properties[0].termType).toStrictEqual(
          "sh_PropertyShape",
        );
        expect(
          (nodeShape.properties[0] as sh_PropertyShape).path,
        ).toEqualRdfTerm(exTbox.property);
      });

      describe("Record", () => {
        it("identifier undefined, path undefined", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {},
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.$identifier()).toEqualRdfTerm(
            dataFactory.namedNode(`${nodeShape.$identifier().value}-test`),
          );
          expect(propertyShape.path).toEqualRdfTerm(
            (exTbox as NamespaceBuilder)("test"),
          );
        });

        it("identifier defined, path undefined", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                $identifier: exTbox.property,
              },
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
          expect(propertyShape.path).toEqualRdfTerm(
            (exTbox as NamespaceBuilder)("test"),
          );
        });

        it("identifier undefined, path defined", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                path: exTbox.property,
              },
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.$identifier()).toEqualRdfTerm(
            dataFactory.namedNode(`${nodeShape.$identifier().value}-test`),
          );
          expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
        });

        it("identifier defined, path defined", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                $identifier: exTbox.property,
                path: exTbox.property,
              },
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
          expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
        });

        it("name from key", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {},
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.name.extract()).toStrictEqual("test");
          expect(
            (
              nodeShape.properties[0] as sh_PropertyShape
            ).shaclmateName.extract(),
          ).toBeUndefined();
        });

        it("explicit name", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: { name: "test2" },
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.name.extract()).toStrictEqual("test2");
          expect(propertyShape.shaclmateName.extract()).toBeUndefined();
        });

        it("explicit shaclmateName", async () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: { shaclmateName: "test2" },
            },
          });
          await expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.name.extract()).toBeUndefined();
          expect(propertyShape.shaclmateName.extract()).toStrictEqual("test2");
        });
      });
    });

    describe("type", () => {
      it.skip("unspecified", async () => {
        const nodeShape = sh.NodeShape("Class", {});
        await expectValidShapes(nodeShape);
        expect(nodeShape.type).toHaveLength(0);
      });

      it("IRI", async () => {
        const nodeShape = sh.NodeShape("Class", { type: owl.Class });
        await expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([owl.Class]);
      });

      it("string", async () => {
        const nodeShape = sh.NodeShape("Class", { type: "XoneMember1" });
        await expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([exTbox.XoneMember1]);
      });
    });
  });

  describe("PropertyShape", () => {
    describe.skip("$identifier", () => {
      it("blank node", async () => {
        const propertyShape = sh.PropertyShape(dataFactory.blankNode(), {
          path: exTbox.property,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("IRI", async () => {
        const propertyShape = sh.PropertyShape(exTbox.property);
        await expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("string", async () => {
        const propertyShape = sh.PropertyShape("property");
        await expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("undefined", async () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: exTbox.property,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });
    });

    describe("cardinality", () => {
      it.skip("unspecified", async () => {
        const propertyShape = sh.PropertyShape("property", {});
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("optional", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "optional",
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("required", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("set", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "set",
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });
    });

    describe("in", () => {
      it.skip("unspecified", async () => {
        const propertyShape = sh.PropertyShape("property");
        await expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toBeUndefined();
      });

      it("primitive", async () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: ["test"],
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          dataFactory.literal("test"),
        ]);
      });

      it("IRI", async () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: [exCbox.LeafConcept],
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
        ]);
      });

      it("skos:ConceptScheme", async () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: conceptScheme,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
          exCbox.TopConcept,
        ]);
      });
    });

    describe("maxCount", () => {
      it.skip("unspecified", async () => {
        const propertyShape = sh.PropertyShape("property");
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
      });

      it("with optional cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "optional",
          maxCount: 2n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("with required cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          maxCount: 10n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("with set cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "set",
          maxCount: 2n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(2n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("without cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", { maxCount: 1n });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });
    });

    describe("minCount", () => {
      it.skip("unspecified", async () => {
        const propertyShape = sh.PropertyShape("property");
        await expectValidShapes(propertyShape);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("with optional cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "optional",
          minCount: 1n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("with required cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          minCount: 0n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("with set cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "set",
          minCount: 1n,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("without cardinality", async () => {
        const propertyShape = sh.PropertyShape("property", { minCount: 1n });
        await expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });
    });

    describe("path", () => {
      it.skip("unspecified", async () => {
        const propertyShape = sh.PropertyShape("property");
        await expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("IRI", async () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: exTbox.property,
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("string", async () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: "property",
        });
        await expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });
    });
  });
});
