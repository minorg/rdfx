import datasetFactory from "@rdfjs/dataset";
import namespace from "@rdfjs/namespace";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { ShapesGraph } from "@shaclmate/compiler";
import { describe, expect, it } from "vitest";
import { builder } from "../src/builder.js";
import { sh_NodeShape, sh_PropertyShape, sh_Shape } from "../src/shapes.js";

const ex = namespace("http://example.com/");

describe("sh", () => {
  function shBuilder() {
    return builder({ namespace: ex }).sh;
  }

  function testShapesGraph(...shapes: readonly sh_Shape[]) {
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
    expect(shapesGraph.nodeShapes.length).toBeGreaterThanOrEqual(
      shapes.reduce(
        (acc, shape) => (sh_NodeShape.issh_NodeShape(shape) ? acc + 1 : acc),
        0,
      ),
    );
    expect(shapesGraph.propertyShapes.length).toBeGreaterThanOrEqual(
      shapes.reduce(
        (acc, shape) =>
          sh_PropertyShape.issh_PropertyShape(shape) ? acc + 1 : acc,
        0,
      ),
    );
  }

  describe("PropertyShape", () => {
    it("minimal", () => {
      testShapesGraph(
        shBuilder().PropertyShape("PropertyShape", {
          cardinality: "required",
          path: ex("path"),
        }),
      );
    });
  });
});
