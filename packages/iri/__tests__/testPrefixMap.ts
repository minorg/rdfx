import { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import dataFactory from "@rdfx/data-factory";

export const testPrefixMap = new PrefixMap(
  [
    ["ex", dataFactory.namedNode("http://example.com/")],
    ["schema", dataFactory.namedNode("http://schema.org/")],
  ],
  { factory: dataFactory },
);
