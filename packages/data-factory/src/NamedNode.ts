import type * as RDF from "@rdfjs/types";
import { Term } from "./Term.js";

/**
 * A term that contains an IRI.
 */
export class NamedNode<TIri extends string = string>
  extends Term
  implements RDF.NamedNode<TIri>
{
  public readonly termType = "NamedNode";

  public constructor(readonly value: TIri) {
    super();
  }

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "NamedNode" && other.value === this.value
    );
  }
}
