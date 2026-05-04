import type * as RDF from "@rdfjs/types";

/**
 * A term that represents an RDF blank node with a label.
 */
export class BlankNode implements RDF.BlankNode {
  public readonly termType = "BlankNode";

  public constructor(readonly value: string) {}

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "BlankNode" && other.value === this.value
    );
  }
}
