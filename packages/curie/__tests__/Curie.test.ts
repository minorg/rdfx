import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, it } from "vitest";
import type { Curie } from "../src/Curie.js";
import { shrinkIri } from "../src/shrinkIri.js";
import { testPrefixMap } from "./testPrefixMap.js";

describe("Curie", () => {
  let sut: Curie;

  beforeAll(() => {
    sut = shrinkIri(dataFactory.namedNode("http://example.com/test"), {
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
