import dataFactory from "@rdfx/data-factory";
import { describe, expect, it } from "vitest";
import { NTriplesTerm } from "../src/NTriplesTerm.js";

describe("NTriplesTerm", () => {
  describe("stringify", () => {
    it("should transform a named node", async () => {
      expect(
        NTriplesTerm.stringify(dataFactory.namedNode("http://example.org")),
      ).toBe("<http://example.org>");
    });

    it("should transform a blank node", async () => {
      expect(NTriplesTerm.stringify(dataFactory.blankNode("b1"))).toBe("_:b1");
    });

    it("should transform a variable", async () => {
      expect(NTriplesTerm.stringify(dataFactory.variable("v1"))).toBe("?v1");
    });

    it("should transform the default graph", async () => {
      expect(NTriplesTerm.stringify(dataFactory.defaultGraph())).toBe("");
    });

    it("should transform a literal", async () => {
      expect(NTriplesTerm.stringify(dataFactory.literal("abc"))).toBe('"abc"');
    });

    it("should transform a literal with a language", async () => {
      expect(NTriplesTerm.stringify(dataFactory.literal("abc", "en"))).toBe(
        '"abc"@en',
      );
    });

    it("should transform a literal with a language and direction", async () => {
      expect(
        NTriplesTerm.stringify(
          dataFactory.literal("abc", { language: "en", direction: "ltr" }),
        ),
      ).toBe('"abc"@en--ltr');
    });

    it("should transform a literal with a datatype", async () => {
      expect(
        NTriplesTerm.stringify(
          dataFactory.literal("abc", dataFactory.namedNode("http://ex")),
        ),
      ).toBe('"abc"^^http://ex');
    });

    it("should transform a quad with non-default graph", async () => {
      expect(
        NTriplesTerm.stringify(
          dataFactory.quad(
            dataFactory.namedNode("ex:s"),
            dataFactory.namedNode("ex:p"),
            dataFactory.namedNode("ex:o"),
            dataFactory.namedNode("ex:g"),
          ),
        ),
      ).toBe("<ex:s> <ex:p> <ex:o> <ex:g> .");
    });

    it("should transform a quad with default graph", async () => {
      expect(
        NTriplesTerm.stringify(
          dataFactory.quad(
            dataFactory.namedNode("ex:s"),
            dataFactory.namedNode("ex:p"),
            dataFactory.namedNode("ex:o"),
          ),
        ),
      ).toBe("<ex:s> <ex:p> <ex:o> .");
    });

    it("should transform a nested quad", async () => {
      expect(
        NTriplesTerm.stringify(
          dataFactory.quad(
            dataFactory.quad(
              dataFactory.namedNode("ex:s"),
              dataFactory.namedNode("ex:p"),
              dataFactory.namedNode("ex:o"),
            ),
            dataFactory.namedNode("ex:p"),
            dataFactory.namedNode("ex:o"),
          ),
        ),
      ).toBe("<<<<<ex:s> <ex:p> <ex:o>>> <ex:p> <ex:o>>>");
    });
  });

  describe("parse", () => {
    const parse = (value: string) =>
      NTriplesTerm.parser(dataFactory)(value).unsafeCoerce();

    it("should transform an empty string to default graph", async () => {
      expect(parse("")).toEqual(dataFactory.defaultGraph());
    });

    it("should transform a blank node", async () => {
      expect(parse("_:b1")).toEqual(dataFactory.blankNode("b1"));
    });

    it("should transform a variable", async () => {
      expect(parse("?v1")).toEqual(dataFactory.variable("v1"));
    });

    it("should transform a literal", async () => {
      expect(parse('"abc"').equals(dataFactory.literal("abc"))).toBeTruthy();
    });

    it("should transform a literal with a datatype", async () => {
      expect(
        parse('"abc"^^http://blabla').equals(
          dataFactory.literal("abc", dataFactory.namedNode("http://blabla")),
        ),
      ).toBeTruthy();
    });

    it("should transform a literal with a datatype incorrectly", async () => {
      expect(
        parse('"abc"^^http://blabla').equals(dataFactory.literal("abc")),
      ).toBeFalsy();
    });

    it("should transform a literal with a language", async () => {
      expect(
        parse('"abc"@en').equals(dataFactory.literal("abc", "en")),
      ).toBeTruthy();
    });

    it("should transform a literal with a language incorrectly", async () => {
      expect(parse('"abc"@en').equals(dataFactory.literal("abc"))).toBeFalsy();
    });

    it("should transform a literal with a language and direction", async () => {
      expect(
        parse('"abc"@en--ltr').equals(
          dataFactory.literal("abc", { language: "en", direction: "ltr" }),
        ),
      ).toBeTruthy();
      expect(
        parse('"abc"@en-us--ltr').equals(
          dataFactory.literal("abc", { language: "en-us", direction: "ltr" }),
        ),
      ).toBeTruthy();
      expect(
        parse('"---"@en-us--ltr').equals(
          dataFactory.literal("---", { language: "en-us", direction: "ltr" }),
        ),
      ).toBeTruthy();
    });

    it("should transform a literal with a language and direction incorrectly", async () => {
      expect(
        parse('"abc"@en--ltr').equals(
          dataFactory.literal("abc", { language: "en", direction: "rtl" }),
        ),
      ).toBeFalsy();
      expect(
        parse('"abc"@en-us--ltr').equals(
          dataFactory.literal("abc", { language: "en-us", direction: "rtl" }),
        ),
      ).toBeFalsy();
    });

    it("should transform a default graph", async () => {
      expect(parse("")).toEqual(dataFactory.defaultGraph());
    });

    it("should transform a named node", async () => {
      expect(parse("<http://example.org>")).toEqual(
        dataFactory.namedNode("http://example.org"),
      );
    });
  });
});
