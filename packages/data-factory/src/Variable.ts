import type * as RDF from "@rdfjs/types";
import { Term } from "./Term.js";

/**
 * A term that represents a variable.
 */
export class Variable extends Term implements RDF.Variable {
  public readonly termType = "Variable";

  public constructor(readonly value: string) {
    super();
  }

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "Variable" && other.value === this.value
    );
  }
}
