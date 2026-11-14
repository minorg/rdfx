import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { Quad } from "@rdfjs/types";
import type { Either } from "purify-ts";
import type { ResourceRecord } from "./ResourceRecord.js";

export interface ResourceRecordParser {
  /**
   * Parse a ResourceRecord into an array of RDF Quads.
   *
   * Receives dataFactory and other parameters here so they don't have to be passed to constructors.
   */
  parse(
    resourceRecord: ResourceRecord,
    options?: { defaultNamespace?: NamespaceBuilder; prefixMap?: PrefixMap },
  ): Either<Error, readonly Quad[]>;
}
