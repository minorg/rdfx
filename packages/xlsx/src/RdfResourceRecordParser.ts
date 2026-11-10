import type { NamespaceBuilder } from "@rdfjs/namespace";
import { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type {
  DatasetCoreFactory,
  Literal,
  NamedNode,
  Quad,
} from "@rdfjs/types";
import { LiteralFactory } from "@rdfx/literal";
import { type Resource, ResourceSet } from "@rdfx/resource";
import { Either, Left } from "purify-ts";
import { invariant } from "ts-invariant";
import type { ResourceRecord } from "./ResourceRecord.js";
import type { ResourceRecordParser } from "./ResourceRecordParser.js";

const OPAQUE_IRI_SCHEMES = new Set(["did", "file", "mailto", "tag", "urn"]);

export class RdfResourceRecordParser implements ResourceRecordParser {
  private readonly defaultNamespace?: NamespaceBuilder;
  private readonly prefixMap?: PrefixMap;

  constructor(options?: {
    defaultNamespace?: NamespaceBuilder;
    prefixMap?: PrefixMap;
  }) {
    this.defaultNamespace = options?.defaultNamespace;
    this.prefixMap = options?.prefixMap;
  }

  parse(
    resourceRecord: ResourceRecord,
    {
      dataFactory,
      datasetFactory,
    }: Parameters<ResourceRecordParser["parse"]>[1],
  ): Either<Error, readonly Quad[]> {
    const defaultNamespace = this.defaultNamespace;
    const literalFactory = new LiteralFactory({ dataFactory });
    const prefixMap =
      this.prefixMap ?? new PrefixMap(undefined, { factory: dataFactory });

    function iriFromString(string: string): Either<Error, NamedNode> {
      invariant(string.length > 0);

      const colonIndex = string.indexOf(":");
      if (colonIndex === -1) {
        // No : in the string.
        if (defaultNamespace) {
          return Either.of(defaultNamespace(string));
        } else {
          return Left(new Error(`ill-formed IRI: ${string}`));
        }
      }

      const prefix = string.substring(0, colonIndex);
      const path = string.substring(colonIndex + 1);
      if (path.length === 0) {
        return Left(new Error(`ill-formed IRI: ${string}`));
      }

      // Absolute http(s) IRI: always wins over a prefix of the same name.
      const scheme = prefix.toLowerCase();
      if ((scheme === "http" || scheme === "https") && path.startsWith("//")) {
        return Either.of(dataFactory.namedNode(string));
      }

      const prefixNamespace = prefixMap.get(prefix);
      if (prefixNamespace !== undefined) {
        return Either.of(
          dataFactory.namedNode(`${prefixNamespace.value}${path}`),
        );
      }

      if (prefix.length === 0 && defaultNamespace) {
        // a "" prefixMap entry takes precedence, above.
        return Either.of(defaultNamespace(path));
      }

      // file, urn, et al. prefixes in the prefixMap take precedence.
      if (OPAQUE_IRI_SCHEMES.has(scheme)) {
        return Either.of(dataFactory.namedNode(string));
      }

      return Left(
        new Error(`unknown IRI prefix or unsupported scheme: ${string}`),
      );
    }

    const resourceSet = new ResourceSet({
      dataFactory: dataFactory,
      dataset: datasetFactory.dataset(),
    });

    let resourceIdentifier: Resource.Identifier;
    switch (typeof resourceRecord["@id"]) {
      case "string": {
        const resourceIriEither = iriFromString(resourceRecord["@id"]);
        if (resourceIriEither.isLeft()) {
          return resourceIriEither;
        }
        resourceIdentifier = resourceIriEither.extract()! as NamedNode;
        break;
      }
      case "undefined":
        resourceIdentifier = dataFactory.blankNode();
        break;
      default:
        return Left(
          new Error(
            `${typeof resourceRecord["@id"]} @id cell cannot be converted to an identifier`,
          ),
        );
    }

    const resource = resourceSet.resource(resourceIdentifier);

    for (const [key, cell] of Object.entries(resourceRecord)) {
      const predicateEither = iriFromString(key);
      if (predicateEither.isLeft()) {
        return predicateEither;
      }
      const predicate = predicateEither.extract() as NamedNode;

      let object: Literal | NamedNode;
      switch (typeof cell) {
        case "boolean":
        case "number":
          object = literalFactory.primitive(cell);
          break;
        case "object":
          if (cell instanceof Date) {
            object = literalFactory.date(cell);
          } else {
            object = dataFactory.literal(cell.value, cell.language);
          }
          break;
        case "string":
          object = (
            iriFromString(cell) as Either<Error, Literal | NamedNode>
          ).orDefault(dataFactory.literal(cell));
          break;
        default:
          cell satisfies never;
          throw new Error("should never reach this point");
      }

      resource.add(predicate, object);
    }

    return Either.of([...resourceSet.dataset]);
  }
}
