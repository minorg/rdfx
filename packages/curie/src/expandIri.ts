import type { NamespaceBuilder } from "@rdfjs/namespace";
import type PrefixMap from "@rdfjs/prefix-map/PrefixMap.js";
import type { DataFactory, NamedNode } from "@rdfjs/types";
import { type Either, Left } from "purify-ts";
import { Curie } from "./Curie.js";
import { validateAbsoluteIri } from "./validateAbsoluteIri.js";

export function expandIri(
  iri: string,
  {
    dataFactory,
    defaultNamespace,
    prefixMap,
  }: {
    dataFactory: DataFactory;
    defaultNamespace?: NamespaceBuilder;
    prefixMap?: PrefixMap;
  },
): Either<Error, NamedNode> {
  if (iri.trim().length === 0) {
    return Left(new Error("empty/blank IRI"));
  }

  const colonIndex = iri.indexOf(":");
  if (colonIndex === -1) {
    // No : in the iri.
    if (defaultNamespace) {
      return validateAbsoluteIri(defaultNamespace(iri).value).map(
        dataFactory.namedNode,
      );
    } else {
      return Left(new Error(`ill-formed IRI: ${iri}`));
    }
  }

  const prefix = iri.substring(0, colonIndex);
  const path = iri.substring(colonIndex + 1);
  if (path.length === 0) {
    return Left(new Error(`ill-formed IRI: ${iri}`));
  }

  // Absolute IRIs with scheme:// always win over prefixes with the same name.
  switch (prefix.toLowerCase()) {
    case "file":
    case "ftp":
    case "http":
    case "https":
    case "git":
    case "irc":
    case "ldap":
    case "postgres":
    case "rtsp":
    case "sftp":
    case "smb":
    case "ssh":
    case "ws":
    case "wss":
      if (path.startsWith("//")) {
        return validateAbsoluteIri(iri).map(dataFactory.namedNode);
      }
      break;
  }

  if (prefixMap) {
    const prefixNamespace = prefixMap.get(prefix);
    if (prefixNamespace !== undefined) {
      return validateAbsoluteIri(`${prefixNamespace.value}${path}`).map(
        (absoluteIri) =>
          new Curie({ prefix, reference: path, value: absoluteIri }),
      );
    }
  }

  if (prefix.length === 0 && defaultNamespace) {
    // a "" prefixMap entry takes precedence, above.
    return validateAbsoluteIri(defaultNamespace(path).value).map(
      dataFactory.namedNode,
    );
  }

  return validateAbsoluteIri(iri).map(dataFactory.namedNode);
}
