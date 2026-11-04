import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, it } from "vitest";
import { Curie } from "../src/Curie.js";
import { testPrefixMap } from "./testPrefixMap.js";

describe("Curie", () => {
  let sut: Curie;

  beforeAll(() => {
    sut = Curie.fromIri(dataFactory.namedNode("http://example.com/test"), {
      prefixMap: testPrefixMap,
    }).unsafeCoerce();
  });

  it("equals", ({ expect }) => {
    expect(sut.equals(sut)).toStrictEqual(true);
    expect(
      sut.equals(dataFactory.namedNode("http://example.com/test")),
    ).toStrictEqual(true);
    expect(sut.equals(dataFactory.blankNode())).toStrictEqual(false);
  });

  describe("fromIri", () => {
    it("should return empty when there's no associated prefix", ({
      expect,
    }) => {
      expect(
        Curie.fromIri(dataFactory.namedNode("http://example2.com/test"), {
          prefixMap: testPrefixMap,
        }).extract(),
      ).toBeUndefined();
    });

    it("should return a CURIE when there's an associated prefix", ({
      expect,
    }) => {
      expect(
        Curie.fromIri(dataFactory.namedNode("http://example.com/test"), {
          prefixMap: testPrefixMap,
        }).extract(),
      ).toBeDefined();
    });
  });

  it("prefix", ({ expect }) => {
    expect(sut.prefix).toStrictEqual("ex");
  });

  it("reference", ({ expect }) => {
    expect(sut.reference).toStrictEqual("test");
  });

  it("value", ({ expect }) => {
    expect(sut.value).toStrictEqual("http://example.com/test");
  });
});
