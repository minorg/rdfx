import type { DataFactory } from "@rdfjs/types";
import { Either, Left } from "purify-ts";
import type { Identifier } from "./Identifier.js";
import { NTriplesTerm } from "./NTriplesTerm.js";

export namespace NTriplesIdentifier {
  export function parser(
    dataFactory: DataFactory,
  ): (value: string) => Either<Error, Identifier> {
    const parser_ = NTriplesTerm.parser(dataFactory);
    return (value: string): Either<Error, Identifier> =>
      parser_(value).chain((term) => {
        switch (term.termType) {
          case "BlankNode":
          case "NamedNode":
            return Either.of(term);
          default:
            return Left(new Error(`not a blank or named node: ${value}`));
        }
      });
  }

  export function stringify(identifier: Identifier): string {
    return NTriplesTerm.stringify(identifier);
  }
}
