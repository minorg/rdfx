import type * as RDF from "@rdfjs/types";
import { Term } from "./Term.js";

/**
 * An instance of DefaultGraph represents the default graph.
 * It's only allowed to assign a DefaultGraph to the .graph property of a Quad.
 */
export class Quad extends Term implements RDF.Quad {
  public readonly termType = "Quad";
  public readonly value = "";

  public constructor(
    readonly subject: RDF.Quad["subject"],
    readonly predicate: RDF.Quad["predicate"],
    readonly object: RDF.Quad["object"],
    readonly graph: RDF.Quad["graph"],
  ) {
    super();
  }

  public equals(other?: RDF.Term | null): boolean {
    // `|| !other.termType` is for backwards-compatibility with old factories without RDF* support.
    return (
      !!other &&
      (other.termType === "Quad" || !other.termType) &&
      this.subject.equals(other.subject) &&
      this.predicate.equals(other.predicate) &&
      this.object.equals(other.object) &&
      this.graph.equals(other.graph)
    );
  }
}
