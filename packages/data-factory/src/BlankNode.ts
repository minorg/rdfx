import type * as RDF from "@rdfjs/types";
import { Term } from "./Term.js";

/**
 * A term that represents an RDF blank node with a label.
 */
export class BlankNode extends Term implements RDF.BlankNode {
  public readonly termType = "BlankNode";

  public constructor(readonly value: string) {
    super();
  }

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "BlankNode" && other.value === this.value
    );
  }
}
