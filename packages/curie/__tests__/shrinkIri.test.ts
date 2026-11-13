import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import { shrinkIri } from "../src/shrinkIri.js";
import { testPrefixMap } from "./testPrefixMap.js";

describe("shrinkIri", () => {
  it("should return empty when there's no associated prefix", ({ expect }) => {
    expect(
      shrinkIri(dataFactory.namedNode("http://example2.com/test"), {
        prefixMap: testPrefixMap,
      }).extract(),
    ).toBeUndefined();
  });

  it("should return a CURIE when there's an associated prefix", ({
    expect,
  }) => {
    expect(
      shrinkIri(dataFactory.namedNode("http://example.com/test"), {
        prefixMap: testPrefixMap,
      }).extract(),
    ).toBeDefined();
  });
});
