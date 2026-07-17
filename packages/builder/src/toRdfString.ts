import { NTriplesTerm } from "@rdfx/string";
import { $Object } from "./shapes.js";

export function toRdfString(...objects: readonly $Object[]): string {
  const result: string[] = [];
  for (const object of objects) {
    for (const quad of $Object.toRdfResource(object).dataset) {
      result.push(NTriplesTerm.stringify(quad));
    }
  }
  return result.join("\n");
}
