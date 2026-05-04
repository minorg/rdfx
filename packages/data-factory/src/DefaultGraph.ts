import type * as RDF from "@rdfjs/types";
import { Term } from "./Term.js";

/**
 * A singleton term instance that represents the default graph.
 * It's only allowed to assign a DefaultGraph to the .graph property of a Quad.
 */
export class DefaultGraph extends Term implements RDF.DefaultGraph {
  public static INSTANCE = new DefaultGraph();

  public readonly termType = "DefaultGraph";
  public readonly value = "";

  private constructor() {
    super();
  }

  public equals(other?: RDF.Term | null): boolean {
    return !!other && other.termType === "DefaultGraph";
  }
}
