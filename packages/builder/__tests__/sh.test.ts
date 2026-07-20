import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import { ShapesGraph } from "@shaclmate/compiler";
import { shaclShaclDataset, ZazukoValidator } from "@shaclmate/validator";
import { describe, expect, it } from "vitest";
import { builder } from "../src/builder.js";
import {
  sh_NodeShape,
  type sh_PropertyShape,
  sh_Shape,
} from "../src/shapes.js";
import "@rdfx/testing";
import type { NamespaceBuilder } from "@rdfjs/namespace";
import { owl, rdf, rdfs, xsd } from "@tpluscode/rdf-ns-builders";
import { exCbox, exTbox } from "./namespaces.js";

describe("sh", () => {
  const { sh } = builder({ defaultNamespace: exTbox });
  const shapesGraphValidator = new ZazukoValidator({
    shapesGraph: shaclShaclDataset,
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

    const validationReport = (
      await shapesGraphValidator.validate(shapesGraphResourceSet.dataset)
    ).unsafeCoerce();
    expect(validationReport.conforms);

    const shapesGraph = ShapesGraph.fromDataset(
      shapesGraphResourceSet.dataset,
    ).unsafeCoerce();
    for (const shape of shapes) {
      const parsedShape = shapesGraph.shape(shape.$identifier()).unsafeCoerce();
      if (sh_NodeShape.issh_NodeShape(shape)) {
        expect(parsedShape.$type).toStrictEqual("NodeShape");
      } else {
        expect(parsedShape.$type).toStrictEqual("PropertyShape");
      }
    }
  }

  describe("NodeShape", () => {
    const propertyShape = sh.PropertyShape("property");

    describe("$identifier", () => {
      it("blank node", () => {
        const nodeShape = sh.NodeShape(dataFactory.blankNode());
        expectValidShapes(nodeShape);
        expect(nodeShape.$identifier().termType).toStrictEqual("BlankNode");
      });

      it("IRI", () => {
        const nodeShape = sh.NodeShape(exTbox.Class);
        expectValidShapes(nodeShape);
        expect(nodeShape.$identifier()).toEqualRdfTerm(exTbox.Class);
      });

      it("string", () => {
        const nodeShape = sh.NodeShape("Class");
        expectValidShapes(nodeShape);
        expect(nodeShape.$identifier()).toEqualRdfTerm(exTbox.Class);
      });

      it("undefined", () => {
        const nodeShape = sh.NodeShape(undefined);
        expectValidShapes(nodeShape);
        expect(nodeShape.$identifier().termType).toStrictEqual("BlankNode");
      });
    });

    describe("implicitClassTarget", () => {
      it("unspecified", () => {
        const nodeShape = sh.NodeShape("Class");
        expectValidShapes(nodeShape);
        expect(nodeShape.type).toHaveLength(0);
      });

      it("true", () => {
        const nodeShape = sh.NodeShape("Class", { implicitClassTarget: true });
        expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([rdfs.Class]);
      });

      it("with other types", () => {
        const nodeShape = sh.NodeShape("Class", {
          implicitClassTarget: true,
          type: [exTbox.XoneMember1],
        });
        expectValidShapes(nodeShape);
        expect(
          nodeShape.type.some((type) => type.equals(rdfs.Class)),
        ).toStrictEqual(true);
        expect(
          nodeShape.type.some((type) => type.equals(exTbox.XoneMember1)),
        ).toStrictEqual(true);
      });
    });

    describe("in", () => {
      it("unspecified", () => {
        const nodeShape = sh.NodeShape("Class", {});
        expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toBeUndefined();
      });

      it("primitive", () => {
        const nodeShape = sh.NodeShape("Class", {
          in_: ["test"],
        });
        expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          dataFactory.literal("test"),
        ]);
      });

      it("IRI", () => {
        const nodeShape = sh.NodeShape("Class", { in_: [exCbox.LeafConcept] });
        expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
        ]);
      });

      it("skos:ConceptScheme", () => {
        const nodeShape = sh.NodeShape("Class", { in_: conceptScheme });
        expectValidShapes(nodeShape);
        expect(nodeShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
          exCbox.TopConcept,
        ]);
      });
    });

    describe("properties", () => {
      it("unspecified", () => {
        const nodeShape = sh.NodeShape("Class", {});
        expectValidShapes(nodeShape);
        expect(nodeShape.properties).toHaveLength(0);
      });

      it("[IRI]", () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: [exTbox.property],
        });
        expectValidShapes(nodeShape, propertyShape);
        expect(nodeShape.properties).toEqualRdfTermArray([exTbox.property]);
      });

      it("[string]", () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: ["property"],
        });
        expectValidShapes(nodeShape, propertyShape);
        expect(nodeShape.properties).toEqualRdfTermArray([exTbox.property]);
      });

      it("[PropertyShape]", () => {
        const nodeShape = sh.NodeShape("Class", {
          properties: [sh.PropertyShape("property")],
        });
        expectValidShapes(nodeShape);
        expect(nodeShape.properties).toHaveLength(1);
        expect(nodeShape.properties[0].termType).toStrictEqual(
          "sh_PropertyShape",
        );
        expect(
          (nodeShape.properties[0] as sh_PropertyShape).path,
        ).toEqualRdfTerm(exTbox.property);
      });

      describe("Record", () => {
        it("identifier undefined, path undefined", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {},
            },
          });
          expectValidShapes(nodeShape);
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

        it("identifier defined, path undefined", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                $identifier: exTbox.property,
              },
            },
          });
          expectValidShapes(nodeShape);
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

        it("identifier undefined, path defined", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                path: exTbox.property,
              },
            },
          });
          expectValidShapes(nodeShape);
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

        it("identifier defined, path defined", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {
                $identifier: exTbox.property,
                path: exTbox.property,
              },
            },
          });
          expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
          expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
        });

        it("name from key", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: {},
            },
          });
          expectValidShapes(nodeShape);
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

        it("explicit name", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: { name: "test2" },
            },
          });
          expectValidShapes(nodeShape);
          expect(nodeShape.properties).toHaveLength(1);
          expect(nodeShape.properties[0].termType).toStrictEqual(
            "sh_PropertyShape",
          );
          const propertyShape = nodeShape.properties[0] as sh_PropertyShape;
          expect(propertyShape.name.extract()).toStrictEqual("test2");
          expect(propertyShape.shaclmateName.extract()).toBeUndefined();
        });

        it("explicit shaclmateName", () => {
          const nodeShape = sh.NodeShape("Class", {
            properties: {
              test: { shaclmateName: "test2" },
            },
          });
          expectValidShapes(nodeShape);
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
      it("unspecified", () => {
        const nodeShape = sh.NodeShape("Class", {});
        expectValidShapes(nodeShape);
        expect(nodeShape.type).toHaveLength(0);
      });

      it("IRI", () => {
        const nodeShape = sh.NodeShape("Class", { type: owl.Class });
        expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([owl.Class]);
      });

      it("string", () => {
        const nodeShape = sh.NodeShape("Class", { type: "XoneMember1" });
        expectValidShapes(nodeShape);
        expect(nodeShape.type).toEqualRdfTermArray([exTbox.XoneMember1]);
      });
    });

    describe("xone", () => {
      it("unspecified", () => {
        const nodeShape = sh.NodeShape("Class", {});
        expectValidShapes(nodeShape);
        expect(nodeShape.xone.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const nodeShape = sh.NodeShape("Class", {
          xone: [exTbox.XoneMember1, exTbox.XoneMember2],
        });
        expectValidShapes(
          nodeShape,
          sh.NodeShape("XoneMember1"),
          sh.NodeShape("XoneMember2"),
        );
        expect(nodeShape.xone.extract()).toEqualRdfTermArray([
          exTbox.XoneMember1,
          exTbox.XoneMember2,
        ]);
      });

      it("rdf:List", () => {
        const nodeShape = sh.NodeShape("List", {
          xone: [
            sh.NodeShape(undefined, {
              hasValues: rdf.nil,
            }),
            sh.NodeShape(undefined, {
              properties: {
                first: {
                  cardinality: "required",
                  datatype: xsd.string,
                  path: rdf.first,
                },
                rest: {
                  cardinality: "required",
                  node: "List",
                  path: rdf.rest,
                },
              },
            }),
          ],
        });
        expectValidShapes(nodeShape);
      });

      it("Shape", () => {
        const nodeShape = sh.NodeShape("Class", {
          xone: [sh.NodeShape("XoneMember1"), sh.NodeShape("XoneMember2")],
        });
        expectValidShapes(nodeShape);
      });

      it("string", () => {
        const nodeShape = sh.NodeShape("Class", {
          xone: ["XoneMember1", "XoneMember2"],
        });
        expectValidShapes(
          nodeShape,
          sh.NodeShape("XoneMember1"),
          sh.NodeShape("XoneMember2"),
        );
        expect(nodeShape.xone.extract()).toEqualRdfTermArray([
          exTbox.XoneMember1,
          exTbox.XoneMember2,
        ]);
      });
    });
  });

  describe("PropertyShape", () => {
    describe("$identifier", () => {
      it("blank node", () => {
        const propertyShape = sh.PropertyShape(dataFactory.blankNode(), {
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape(exTbox.property);
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property");
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier()).toEqualRdfTerm(exTbox.property);
      });

      it("undefined", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.$identifier().termType).toStrictEqual("BlankNode");
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });
    });

    describe("cardinality", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property", {});
        expectValidShapes(propertyShape);
        expect(propertyShape.maxCount.extract()).toBeUndefined();
        expect(propertyShape.minCount.extract()).toBeUndefined();
      });

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

    describe("in", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property");
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toBeUndefined();
      });

      it("primitive", () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: ["test"],
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          dataFactory.literal("test"),
        ]);
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: [exCbox.LeafConcept],
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.in_.extract()).toEqualRdfTermArray([
          exCbox.LeafConcept,
        ]);
      });

      it("skos:ConceptScheme", () => {
        const propertyShape = sh.PropertyShape("property", {
          in_: conceptScheme,
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
        const propertyShape = sh.PropertyShape("property");
        expectValidShapes(propertyShape);
        expect(propertyShape.node.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          node: exTbox.Class,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(exTbox.Class);
      });

      it.skip("inline node shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          node: exTbox.Class,
        });
        expect(propertyShape.node.extract()).toEqualRdfTerm(exTbox.Class);
      });
    });

    describe("path", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property");
        expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: exTbox.property,
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape(undefined, {
          path: "property",
        });
        expectValidShapes(propertyShape);
        expect(propertyShape.path).toEqualRdfTerm(exTbox.property);
      });
    });

    describe("resolve", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property");
        expectValidShapes(propertyShape);
        expect(propertyShape.resolve.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          resolve: exTbox.Class,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(exTbox.Class);
      });

      it.skip("inline resolve shape", () => {
        throw new Error("implement me");
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          resolve: exTbox.Class,
        });
        expect(propertyShape.resolve.extract()).toEqualRdfTerm(exTbox.Class);
      });
    });

    describe("xone", () => {
      it("unspecified", () => {
        const propertyShape = sh.PropertyShape("property", {});
        expectValidShapes(propertyShape);
        expect(propertyShape.xone.extract()).toBeUndefined();
      });

      it("IRI", () => {
        const propertyShape = sh.PropertyShape("property", {
          xone: [exTbox.XoneMember1, exTbox.XoneMember2],
        });
        expectValidShapes(
          propertyShape,
          sh.PropertyShape("XoneMember1"),
          sh.PropertyShape("XoneMember2"),
        );
        expect(propertyShape.xone.extract()).toEqualRdfTermArray([
          exTbox.XoneMember1,
          exTbox.XoneMember2,
        ]);
      });

      it("Shape", () => {
        const propertyShape = sh.PropertyShape("property", {
          xone: [
            sh.PropertyShape("XoneMember1"),
            sh.PropertyShape("XoneMember2"),
          ],
        });
        expectValidShapes(propertyShape);
      });

      it("string", () => {
        const propertyShape = sh.PropertyShape("property", {
          xone: ["XoneMember1", "XoneMember2"],
        });
        expectValidShapes(
          propertyShape,
          sh.PropertyShape("XoneMember1"),
          sh.PropertyShape("XoneMember2"),
        );
        expect(propertyShape.xone.extract()).toEqualRdfTermArray([
          exTbox.XoneMember1,
          exTbox.XoneMember2,
        ]);
      });
    });
  });
});
