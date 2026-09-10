import type { DataFactory, Quad } from "@rdfjs/types";
import type { UncompressedRdfFormat } from "@rdfx/format";
import {
  Parser as N3Parser,
  type ParserOptions as N3ParserOptions,
  type PrefixCallback,
} from "n3";
import { Either } from "purify-ts";

export function parseSync(
  input: string,
  {
    dataFactory,
    prefixCallback,
    ...otherOptions
  }: {
    dataFactory: DataFactory;
    format?: Exclude<UncompressedRdfFormat["mimeType"], "application/ld+json">;
    prefixCallback?: PrefixCallback;
  } & Omit<N3ParserOptions, "factory" | "format">,
): Either<Error, readonly Quad[]> {
  return Either.encase(() => {
    const n3Parser = new N3Parser({ ...otherOptions, factory: dataFactory });
    return n3Parser.parse(input, undefined, prefixCallback);
  });
}
