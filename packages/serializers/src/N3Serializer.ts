import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Sink, Stream } from "@rdfjs/types";
import { type MimeFormat, type Prefixes, StreamWriter } from "n3";
import type { Readable } from "readable-stream";

export type SerializerOptions = {
  prefixes?: PrefixMap;
  end?: boolean;
};

export default class N3Serializer implements Sink<Stream, Stream> {
  private readonly options: SerializerOptions;

  constructor(options: SerializerOptions & { format: MimeFormat }) {
    this.options = options;
  }

  import(input: Stream, options?: SerializerOptions): Stream {
    options = { ...this.options, ...options };
    const { prefixes: prefixMap, ...otherOptions } = options;
    let prefixes: Prefixes | undefined;
    if (prefixMap) {
      // N3 expects a Record<string, NamedNode> and PrefixMap is a Map<string, NamedNode>
      prefixes = {};
      for (const entry of prefixMap.entries()) {
        prefixes[entry[0]] = entry[1];
      }
    }

    const writer = new StreamWriter({ ...otherOptions, prefixes });

    input.on("error", (err) => writer.emit("error", err));
    (input as unknown as Readable).pipe(writer);

    return writer;
  }
}
