import type * as RDF from "@rdfjs/types";
import { NTriplesTerm } from "@rdfx/string";
import { termToJson } from "./termToJson.js";

export abstract class Term {
  abstract readonly termType:
    | "BlankNode"
    | "DefaultGraph"
    | "Literal"
    | "NamedNode"
    | "Quad"
    | "Variable";
  abstract readonly value: string;

  toJSON() {
    return termToJson(this as unknown as RDF.Term);
  }

  toString(): string {
    return NTriplesTerm.stringify(this as unknown as RDF.Term);
  }
}
