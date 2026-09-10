import type { ParserOptions as JsonLdParserOptions } from "@rdfjs/parser-jsonld";
import type { ParserOptions as N3ParserOptions } from "@rdfjs/parser-n3";
import type { DataFactory, Quad } from "@rdfjs/types";
import type { UncompressedRdfFormat } from "@rdfx/format";
import { streamToArray } from "@rdfx/stream";

import { type PrefixCallback, Parser as SyncN3Parser } from "n3";
import { type Either, EitherAsync } from "purify-ts";
import { Readable } from "readable-stream";
import parsers from "./index.js";

export async function parse(
  input: string,
  {
    dataFactory,
    format,
    prefixCallback,
    ...otherOptions
  }: {
    dataFactory: DataFactory;
    format?: UncompressedRdfFormat["mimeType"];
    prefixCallback?: PrefixCallback;
  } & Omit<JsonLdParserOptions & N3ParserOptions, "factory" | "format">,
): Promise<Either<Error, readonly Quad[]>> {
  return EitherAsync(async ({ liftEither }) => {
    if (format) {
      const stream = parsers({ ...otherOptions, dataFactory }).import(
        format,
        Readable.from([input]),
      );
      if (stream === null) {
        throw new RangeError(`unsupported format: ${format}`);
      }
      return await liftEither(await streamToArray(stream));
    } else {
      const n3Parser = new SyncN3Parser({
        ...otherOptions,
        factory: dataFactory,
        format,
      });
      return n3Parser.parse(input, undefined, prefixCallback);
    }
  });
}
