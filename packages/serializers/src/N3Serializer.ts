import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Sink, Stream } from "@rdfjs/types";
import { type MimeFormat, StreamWriter } from "n3";
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
    const writer = new StreamWriter({ ...this.options, ...options });

    input.on("error", (err) => writer.emit("error", err));
    (input as unknown as Readable).pipe(writer);

    return writer;
  }
}
