import type { DefaultGraph, NamedNode, Quad_Graph } from "@rdfjs/types";
import { Either, Left } from "purify-ts";

export type GraphIdentifier = DefaultGraph | NamedNode;

export namespace GraphIdentifier {
  export function fromQuadGraph(
    quadGraph: Quad_Graph,
  ): Either<Error, GraphIdentifier> {
    switch (quadGraph.termType) {
      case "DefaultGraph":
      case "NamedNode":
        return Either.of(quadGraph);
      default:
        return Left(new RangeError(quadGraph.termType));
    }
  }

  export function stringify(graphIdentifier: GraphIdentifier): string {
    return graphIdentifier.value;
  }
}
