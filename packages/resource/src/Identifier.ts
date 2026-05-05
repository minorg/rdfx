import type { BlankNode, DataFactory, NamedNode } from "@rdfjs/types";

export type Identifier = BlankNode | NamedNode;

export namespace Identifier {
  export function fromString({
    dataFactory,
    identifier,
  }: {
    dataFactory: DataFactory;
    identifier: string;
  }) {
    if (identifier.startsWith("_:")) {
      return dataFactory.blankNode(identifier.substring("_:".length));
    }
    if (
      identifier.startsWith("<") &&
      identifier.endsWith(">") &&
      identifier.length > 2
    ) {
      return dataFactory.namedNode(
        identifier.substring(1, identifier.length - 1),
      );
    }
    throw new RangeError(identifier);
  }
}
