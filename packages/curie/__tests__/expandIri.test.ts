import namespace from "@rdfjs/namespace";
import { PrefixMap } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import { describe, it } from "vitest";
import "@rdfx/testing";
import { expandIri } from "../src/expandIri.js";

describe("expandIri", () => {
  const defaultNamespace = namespace("http://example.com");
  const prefixMap = new PrefixMap(
    [
      ["", dataFactory.namedNode("http://example.org/")],
      ["ex", dataFactory.namedNode("http://example.org/")],
      ["http", dataFactory.namedNode("http://www.w3.org/2006/http#")],
    ],
    { factory: dataFactory },
  );

  it("empty string", ({ expect }) => {
    expect(expandIri("", { dataFactory })).toBeLeft();
  });

  it("blank string", ({ expect }) => {
    expect(expandIri("  ", { dataFactory })).toBeLeft();
  });

  describe("no scheme/prefix", () => {
    it("with default namespace", ({ expect }) => {
      expect(
        expandIri("test", { dataFactory, defaultNamespace }).unsafeCoerce(),
      ).toEqualRdfTerm(defaultNamespace("test"));
    });

    it("without default namespace", ({ expect }) => {
      expect(expandIri("test", { dataFactory })).toBeLeft();
    });
  });

  it("scheme/prefix with no path", ({ expect }) => {
    expect(expandIri("urn:", { dataFactory })).toBeLeft();
  });

  it("http:// IRI, ignore http scheme in prefix map", ({ expect }) => {
    expect(
      expandIri("http://other.com/test", {
        dataFactory,
        defaultNamespace,
        prefixMap,
      }).unsafeCoerce(),
    ).toEqualRdfTerm(dataFactory.namedNode("http://other.com/test"));
  });

  it("http:path without //, use prefix map", ({ expect }) => {
    expect(
      expandIri("http:test", {
        dataFactory,
        defaultNamespace,
        prefixMap,
      }).unsafeCoerce(),
    ).toEqualRdfTerm(dataFactory.namedNode("http://www.w3.org/2006/http#test"));
  });

  it("empty string ('') prefix in prefix map takes precedence over default namespace", ({
    expect,
  }) => {
    expect(
      expandIri(":test", {
        dataFactory,
        defaultNamespace,
        prefixMap,
      }).unsafeCoerce(),
    ).toEqualRdfTerm(dataFactory.namedNode("http://example.org/test"));
  });

  it("ex prefix in prefix map", ({ expect }) => {
    expect(
      expandIri("ex:test", {
        dataFactory,
        defaultNamespace,
        prefixMap,
      }).unsafeCoerce(),
    ).toEqualRdfTerm(dataFactory.namedNode("http://example.org/test"));
  });

  it("fall through to assume well-formed IRI", ({ expect }) => {
    expect(
      expandIri("http://example.net/test", {
        dataFactory,
        defaultNamespace,
        prefixMap,
      }).unsafeCoerce(),
    ).toEqualRdfTerm(dataFactory.namedNode("http://example.net/test"));
  });
});
