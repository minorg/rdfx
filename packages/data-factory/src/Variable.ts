import type * as RDF from "@rdfjs/types";

/**
 * A term that represents a variable.
 */
export class Variable implements RDF.Variable {
  public readonly termType = "Variable";

  public constructor(readonly value: string) {}

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "Variable" && other.value === this.value
    );
  }
}
