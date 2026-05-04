import type * as RDF from "@rdfjs/types";

/**
 * An instance of DefaultGraph represents the default graph.
 * It's only allowed to assign a DefaultGraph to the .graph property of a Quad.
 */
export class Quad implements RDF.BaseQuad {
  public readonly termType = "Quad";
  public readonly value = "";

  public constructor(
    readonly subject: RDF.Term,
    readonly predicate: RDF.Term,
    readonly object: RDF.Term,
    readonly graph: RDF.Term,
  ) {}

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
