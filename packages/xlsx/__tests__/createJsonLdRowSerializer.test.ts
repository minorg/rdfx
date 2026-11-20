import dataFactory from "@rdfx/data-factory";
import { xsd } from "@tpluscode/rdf-ns-builders";
import { describe, it } from "vitest";
import { createJsonLdRowSerializer } from "../src/createJsonLdRowSerializer.js";
import { logger } from "./logger.js";
import {
  $DefaultPartial,
  $Lazy,
  NodeShape1,
  NodeShape2,
} from "./xlsx-test-shapes.shaclmate.js";

describe("createJsonLdRowSerializer", () => {
  it("NodeShape1", ({ expect }) => {
    const object = NodeShape1.createUnsafe({
      $identifier: dataFactory.namedNode("http://example.com/test"),
      booleanProperty: true,
      dateProperty: new Date(),
      dateTimeProperty: new Date(),
      decimalProperty: "42.3",
      doubleProperty: 42.3,
      integerProperty: "42",
      intProperty: 42,
      iriProperty: "http://example.com/iriProperty",
      langStringSetProperty: [
        dataFactory.literal("entest", "en"),
        dataFactory.literal("frtest", "fr"),
      ],
      literalSetProperty: [dataFactory.literal("4.23e1", xsd.double)],
      nodeProperty: $Lazy.fromPartial<$DefaultPartial, NodeShape2>(
        $DefaultPartial.createUnsafe({
          $identifier: dataFactory.namedNode("http://example.com/nodeProperty"),
        }),
      ),
      stringProperty: "string",
      termSetProperty: [dataFactory.literal("true", xsd.boolean)],
    });
    const row: any = createJsonLdRowSerializer(NodeShape1)(object, {
      dataFactory,
      logger,
    });
    expect(Array.isArray(row)).toStrictEqual(false);
    expect(Object.keys(row)).toHaveLength(15);
    expect(row["@id"]).toStrictEqual("http://example.com/test");
    expect(row["booleanProperty"]).toStrictEqual(object.booleanProperty);
    expect(row["dateProperty"]).toBeInstanceOf(Date);
    expect(row["dateTimeProperty"]).toBeInstanceOf(Date);
    expect((row["dateTimeProperty"] as Date).getTime()).toStrictEqual(
      object.dateTimeProperty.getTime(),
    );
    expect(row["decimalProperty"]).toStrictEqual(
      object.decimalProperty.toFixed(),
    );
    expect(row["doubleProperty"]).toStrictEqual(object.doubleProperty);
    expect(row["integerProperty"]).toStrictEqual(
      object.integerProperty.toString(),
    );
    expect(row["intProperty"]).toStrictEqual(object.intProperty);
    expect(row["iriProperty"]).toStrictEqual(object.iriProperty.value);
    expect(row["langStringSetProperty@en.0"]).toStrictEqual("entest");
    expect(row["langStringSetProperty@fr.0"]).toStrictEqual("frtest");
    expect(row["literalSetProperty.0"]).toStrictEqual(42.3);
    expect(row["nodeProperty"]).toStrictEqual(
      "http://example.com/nodeProperty",
    );
    expect(row["stringProperty"]).toStrictEqual("string");
    expect(row["termSetProperty.0"]).toStrictEqual(true);
  });

  it("NodeShape2", ({ expect }) => {
    const row: any = createJsonLdRowSerializer(NodeShape2)(
      NodeShape2.createUnsafe({
        label: [
          dataFactory.literal("entest", "en"),
          dataFactory.literal("frtest", "fr"),
        ],
      }),
      {
        dataFactory,
        logger,
      },
    );
    expect(Array.isArray(row)).toStrictEqual(false);
    expect(Object.keys(row)).toHaveLength(3);
    expect(row["@id"].startsWith("_:")).toStrictEqual(true);
    expect(row["label@en.0"]).toStrictEqual("entest");
    expect(row["label@fr.0"]).toStrictEqual("frtest");
  });
});
