/** biome-ignore-all lint/correctness/noEmptyCharacterClassInRegex: adapted */
import toNT from "@rdfjs/to-ntriples";
import type { DataFactory, Term } from "@rdfjs/types";
import { Either, Left } from "purify-ts";

function parseLiteralDirection(
  literalValue: string,
): Either<Error, "ltr" | "rtl" | ""> {
  const doubleDashPos = literalValue.indexOf(
    "--",
    literalValue.lastIndexOf('"'),
  );
  if (doubleDashPos >= 0) {
    const direction = literalValue.slice(
      doubleDashPos + 2,
      literalValue.length,
    );
    if (direction === "ltr" || direction === "rtl") {
      return Either.of(direction);
    }
    return Left(
      new Error(`${literalValue} is not a literal with a valid direction`),
    );
  }
  return Either.of("");
}

function parseLiteralLanguage(literalValue: string): Either<Error, string> {
  const match = /^"[^]*"(?:@([^"@]+)|\^\^[^"]+)?$/u.exec(literalValue);
  if (!match) {
    return Left(new Error(`${literalValue} is not a literal`));
  }
  if (match[1]) {
    let ret = match[1].toLowerCase();

    // Remove everything after --, since this indicates the base direction, which will be parsed later.
    const doubleDashPos = ret.indexOf("--");
    if (doubleDashPos >= 0) {
      ret = ret.slice(0, doubleDashPos);
    }

    return Either.of(ret);
  }
  return Either.of("");
}

function parseLiteralType(literalValue: string): Either<Error, string> {
  const match = /^"[^]*"(?:\^\^<([^>]+)>|(@)[^"@]+)?$/u.exec(literalValue);
  if (!match) {
    return Left(new Error(`${literalValue} is not a literal`));
  }
  return Either.of(
    match[1] ||
      (match[2]
        ? "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
        : "http://www.w3.org/2001/XMLSchema#string"),
  );
}

function parseLiteralValue(literalValue: string): Either<Error, string> {
  const match = /^"([^]*)"/u.exec(literalValue);
  if (!match) {
    return Left(new Error(`${literalValue} is not a literal`));
  }
  return Either.of(match[1]);
}

export namespace NTriplesTerm {
  export function parser(
    dataFactory: DataFactory,
  ): (value: string) => Either<Error, Term> {
    return (value): Either<Error, Term> => {
      // DefaultGraph
      if (value.length === 0) {
        return Either.of(dataFactory.defaultGraph());
      }

      switch (value[0]) {
        // BlankNode
        case "_":
          return Either.of(dataFactory.blankNode(value.slice(2)));
        // Literal
        case '"': {
          return parseLiteralValue(value).chain((literalValue) =>
            parseLiteralLanguage(value).chain((literalLanguage) =>
              literalLanguage.length === 0
                ? parseLiteralType(value).map((literalType) =>
                    dataFactory.literal(
                      literalValue,
                      dataFactory.namedNode(literalType),
                    ),
                  )
                : parseLiteralDirection(value).map((literalDirection) =>
                    dataFactory.literal(literalValue, {
                      language: literalLanguage,
                      direction: literalDirection,
                    }),
                  ),
            ),
          );
        }
        // NamedNode
        case "<": {
          if (value.startsWith("<<") && value.endsWith(">>")) {
            return Left(new Error(`nested quads are unsupported: ${value}`));
          }
          return Either.of(dataFactory.namedNode(value.slice(1, -1)));
        }
        // Variable
        case "?":
          if (!dataFactory.variable) {
            return Left(
              new Error(`missing 'variable()' method on the given DataFactory`),
            );
          }
          return Either.of(dataFactory.variable(value.slice(1)));
        default:
          return Left(new Error(`unable to parse term: ${value}`));
      }
    };
  }

  export function stringify(term: Term): string {
    return toNT(term);
  }
}
