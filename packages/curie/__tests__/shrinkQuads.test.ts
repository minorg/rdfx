import type { Quad } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { beforeAll, describe, expect, it } from "vitest";
import { Curie } from "../src/Curie.js";
import { shrinkQuads } from "../src/shrinkQuads.js";
import { testPrefixMap } from "./testPrefixMap.js";

describe("shrinkQuads", () => {
  const ex = (reference: string) =>
    dataFactory.namedNode(`http://example.com/${reference}`);
  const referenceCounts: Record<string, number> = {};
  let curieQuads: readonly Quad[];

  beforeAll(() => {
    curieQuads = [
      ...shrinkQuads(
        [
          dataFactory.quad(ex("subject"), ex("predicate"), ex("object")),
          dataFactory.quad(
            ex("subject"),
            ex("predicate"),
            dataFactory.blankNode(),
          ),
          dataFactory.quad(
            ex("subject"),
            ex("predicate"),
            dataFactory.literal("test"),
          ),
          dataFactory.quad(
            ex("subject"),
            ex("predicate"),
            dataFactory.namedNode("http://example2.com/object"),
            ex("graph"),
          ),
        ],
        {
          dataFactory,
          prefixMap: testPrefixMap,
          referenceCounts,
        },
      ),
    ];
    expect(curieQuads).toHaveLength(4);
  });

  it("should insert CURIEs where relevant", ({ expect }) => {
    expect(curieQuads[0].subject).toBeInstanceOf(Curie);
    expect(curieQuads[0].predicate).toBeInstanceOf(Curie);
    expect(curieQuads[0].object).toBeInstanceOf(Curie);
    expect(curieQuads[0].graph).not.toBeInstanceOf(Curie);

    expect(curieQuads[1].subject).toBeInstanceOf(Curie);
    expect(curieQuads[1].predicate).toBeInstanceOf(Curie);
    expect(curieQuads[1].object).not.toBeInstanceOf(Curie);
    expect(curieQuads[1].graph).not.toBeInstanceOf(Curie);

    expect(curieQuads[2].subject).toBeInstanceOf(Curie);
    expect(curieQuads[2].predicate).toBeInstanceOf(Curie);
    expect(curieQuads[2].object).not.toBeInstanceOf(Curie);
    expect(curieQuads[2].graph).not.toBeInstanceOf(Curie);

    expect(curieQuads[3].subject).toBeInstanceOf(Curie);
    expect(curieQuads[3].predicate).toBeInstanceOf(Curie);
    expect(curieQuads[3].object).not.toBeInstanceOf(Curie);
    expect(curieQuads[3].graph).toBeInstanceOf(Curie);
  });

  it("should count references", ({ expect }) => {
    expect(Object.keys(referenceCounts)).toHaveLength(4);
    expect(referenceCounts["subject"]).toStrictEqual(4);
    expect(referenceCounts["predicate"]).toStrictEqual(4);
    expect(referenceCounts["object"]).toStrictEqual(1);
    expect(referenceCounts["graph"]).toStrictEqual(1);
  });
});
