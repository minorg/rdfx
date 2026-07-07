import datasetFactory from "@rdfjs/dataset";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { ShapesGraph } from "@shaclmate/compiler";
import { shaclShaclDataset, ZazukoValidator } from "@shaclmate/validator";
import { describe, expect, it } from "vitest";
import { builder } from "../src/builder.js";
import { sh_NodeShape, sh_Shape } from "../src/shapes.js";
import "@rdfx/testing";
import { exCbox, exTbox } from "./namespaces.js";

describe("sh", () => {
  const { sh } = builder({ namespace: exTbox });
  const { skos } = builder({ namespace: exCbox });
  const shapesGraphValidator = new ZazukoValidator({
    shapesGraph: shaclShaclDataset,
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

    const validationReport = (
      await shapesGraphValidator.validate(shapesGraphResourceSet.dataset)
    ).unsafeCoerce();
    expect(validationReport.conforms);

    const shapesGraph = ShapesGraph.builder()
      .parseDataset(shapesGraphResourceSet.dataset)
      .unsafeCoerce()
      .build();
    for (const shape of shapes) {
      const parsedShape = shapesGraph.shape(shape.$identifier()).unsafeCoerce();
      if (sh_NodeShape.issh_NodeShape(shape)) {
        expect(parsedShape.$type).toStrictEqual("NodeShape");
      } else {
        expect(parsedShape.$type).toStrictEqual("PropertyShape");
      }
    }
  }

  describe("PropertyShape", () => {
    describe("$identifier", () => {
      it("blank node", () => {
        const propertyShape = sh.PropertyShape(dataFactory.blankNode(), {
          cardinality: "required",
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape(exTbox.property, {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("undefined", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          cardinality: "required",
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
      });
    });

    describe("cardinality", () => {
      it("optional", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "optional",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("required", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("set", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "set",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });
    });

    describe("classes", () => {
      it("unspecified", ({ expect }) => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.classes).toHaveLength(0);
      });

      it("IRI", ({ expect }) => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          classes: [exTbox.Class],
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.classes).toEqualRdfTermArray([exTbox.Class]);
      });

      it("string", ({ expect }) => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          classes: ["Class"],
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.classes).toEqualRdfTermArray([exTbox.Class]);
      });
    });

    describe("in", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          in_: [exCbox.LeafConcept],
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
        ]);
      });

      it("skos:ConceptScheme", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          in_: skos.ConceptScheme("ConceptScheme", {
            concepts: {
              LeafConcept: {
                $identifier: exCbox.LeafConcept,
              },
              TopConcept: {
                $identifier: exCbox.TopConcept,
              },
            },
          }),
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
          exCbox.TopConcept,
        ]);
      });
    });

    describe("node", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.node.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          node: exTbox.Class,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(exTbox.Class);
      });

      it.skip("inline node shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          node: exTbox.Class,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(exTbox.Class);
      });
    });

    describe("path", () => {
      it("IRI", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          cardinality: "required",
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          cardinality: "required",
          path: "property",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });
    });

    describe("resolve", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.resolve.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          resolve: exTbox.Class,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(exTbox.Class);
      });

      it.skip("inline resolve shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          cardinality: "required",
          resolve: exTbox.Class,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(exTbox.Class);
      });
    });
  });
});
