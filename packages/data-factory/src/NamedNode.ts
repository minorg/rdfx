import type * as RDF from "@rdfjs/types";

/**
 * A term that contains an IRI.
 */
export class NamedNode<TIri extends string = string>
  implements RDF.NamedNode<TIri>
{
  public readonly termType = "NamedNode";

  public constructor(readonly value: TIri) {}

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other && other.termType === "NamedNode" && other.value === this.value
    );
  }
}
