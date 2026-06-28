import datasetFactory from "@rdfjs/dataset";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { ShapesGraph } from "@shaclmate/compiler";
import { skos } from "@tpluscode/rdf-ns-builders";
import { describe, expect, it } from "vitest";
import { builder } from "../src/builder.js";
import { sh_NodeShape, sh_Shape } from "../src/shapes.js";
import "@rdfx/testing";

describe("sh", () => {
  function shBuilder() {
    return builder({ namespace: skos }).sh;
  }

  function expectParseableShapesGraph(...shapes: readonly sh_Shape[]) {
    expect(shapes).not.toHaveLength(0);
    const resourceSet = new ResourceSet({
      dataFactory,
      dataset: datasetFactory.dataset(),
    });
    for (const shape of shapes) {
      sh_Shape.toRdfResource(shape, { resourceSet });
    }
    const shapesGraph = ShapesGraph.builder()
      .parseDataset(resourceSet.dataset)
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
    describe("cardinality", () => {
      it("optional", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "optional",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

      it("required", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "required",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.maxCount.extract()).toStrictEqual(1n);
        expect(propertyShape.minCount.extract()).toStrictEqual(1n);
      });

      it("set", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "set",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });
    });

    describe("identifier", () => {
      it("blank node", () => {
        const propertyShape = shBuilder().PropertyShape(
          dataFactory.blankNode(),
          {
            cardinality: "required",
            path: skos.prefLabel,
          },
        );
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
      });

      it("IRI", () => {
        const propertyShape = shBuilder().PropertyShape(skos.prefLabel, {
          cardinality: "required",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(skos.prefLabel);
      });

      it("string", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "required",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(skos.prefLabel);
      });

      it("undefined", () => {
        const propertyShape = shBuilder().PropertyShape(undefined, {
          cardinality: "required",
          path: skos.prefLabel,
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
      });
    });

    describe("node", () => {
      it("unspecified", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "required",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.node.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = shBuilder().PropertyShape("broader", {
          cardinality: "required",
          node: skos.Concept,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(skos.Concept);
      });

      it.skip("inline node shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = shBuilder().PropertyShape("broader", {
          cardinality: "required",
          node: skos.Concept,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(skos.Concept);
      });
    });

    describe("path", () => {
      it("IRI", () => {
        const propertyShape = shBuilder().PropertyShape(undefined, {
          cardinality: "required",
          path: skos.prefLabel,
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(skos.prefLabel);
      });

      it("string", () => {
        const propertyShape = shBuilder().PropertyShape(undefined, {
          cardinality: "required",
          path: "prefLabel",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(skos.prefLabel);
      });
    });

    describe("resolve", () => {
      it("unspecified", () => {
        const propertyShape = shBuilder().PropertyShape("prefLabel", {
          cardinality: "required",
        });
        expectParseableShapesGraph(propertyShape);
        expect(propertyShape.resolve.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = shBuilder().PropertyShape("broader", {
          cardinality: "required",
          resolve: skos.Concept,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(skos.Concept);
      });

      it.skip("inline resolve shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = shBuilder().PropertyShape("broader", {
          cardinality: "required",
          resolve: skos.Concept,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(skos.Concept);
      });
    });
  });
});
