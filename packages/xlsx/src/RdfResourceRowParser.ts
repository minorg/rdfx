import type { NamespaceBuilder } from "@rdfjs/namespace";
import { default as PrefixMap } from "@rdfjs/prefix-map/PrefixMap.js";
import type {
  DatasetCoreFactory,
  Literal,
  NamedNode,
  Quad,
} from "@rdfjs/types";
import { type Resource, ResourceSet } from "@rdfx/resource";
import { Either, Left } from "purify-ts";
import { invariant } from "ts-invariant";
import type { ResourceRow } from "./ResourceRow.js";
import { ResourceRowParser } from "./ResourceRowParser.js";

const OPAQUE_IRI_SCHEMES = new Set(["did", "file", "mailto", "tag", "urn"]);

export class RdfResourceRowParser extends ResourceRowParser {
  private readonly datasetFactory: DatasetCoreFactory;
  private readonly defaultNamespace?: NamespaceBuilder;
  private readonly prefixMap: PrefixMap;

  constructor({
    datasetFactory,
    defaultNamespace,
    prefixMap,
    ...superParameters
  }: {
    datasetFactory: DatasetCoreFactory;
    defaultNamespace?: NamespaceBuilder;
    prefixMap?: PrefixMap;
  } & ConstructorParameters<typeof ResourceRowParser>[0]) {
    super(superParameters);
    this.datasetFactory = datasetFactory;
    this.defaultNamespace = defaultNamespace;
    this.prefixMap =
      prefixMap ?? new PrefixMap(undefined, { factory: this.dataFactory });
  }

  private iriFromString(string: string): Either<Error, NamedNode> {
    invariant(string.length > 0);

    const colonIndex = string.indexOf(":");
    if (colonIndex === -1) {
      // No : in the string.
      if (this.defaultNamespace) {
        return Either.of(this.defaultNamespace(string));
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
      return Either.of(this.dataFactory.namedNode(string));
    }

    const prefixNamespace = this.prefixMap.get(prefix);
    if (prefixNamespace !== undefined) {
      return Either.of(
        this.dataFactory.namedNode(`${prefixNamespace.value}${path}`),
      );
    }

    if (prefix.length === 0 && this.defaultNamespace) {
      // a "" prefixMap entry takes precedence, above.
      return Either.of(this.defaultNamespace(path));
    }

    // file, urn, et al. prefixes in the prefixMap take precedence.
    if (OPAQUE_IRI_SCHEMES.has(scheme)) {
      return Either.of(this.dataFactory.namedNode(string));
    }

    return Left(
      new Error(`unknown IRI prefix or unsupported scheme: ${string}`),
    );
  }

  override parse(resourceRow: ResourceRow): Either<Error, readonly Quad[]> {
    const resourceSet = new ResourceSet({
      dataFactory: this.dataFactory,
      dataset: this.datasetFactory.dataset(),
    });

    let resourceIdentifier: Resource.Identifier;
    switch (typeof resourceRow["@id"]) {
      case "string": {
        const resourceIriEither = this.iriFromString(resourceRow["@id"]);
        if (resourceIriEither.isLeft()) {
          return resourceIriEither;
        }
        resourceIdentifier = resourceIriEither.extract()! as NamedNode;
        break;
      }
      case "undefined":
        resourceIdentifier = this.dataFactory.blankNode();
        break;
      default:
        return Left(
          new Error(
            `${typeof resourceRow["@id"]} @id cell cannot be converted to an identifier`,
          ),
        );
    }

    const resource = resourceSet.resource(resourceIdentifier);

    for (const [key, cell] of Object.entries(resourceRow)) {
      const predicateEither = this.iriFromString(key);
      if (predicateEither.isLeft()) {
        return predicateEither;
      }
      const predicate = predicateEither.extract() as NamedNode;

      let object: Literal | NamedNode;
      switch (typeof cell) {
        case "boolean":
        case "number":
          object = this.literalFactory.primitive(cell);
          break;
        case "object":
          if (cell instanceof Date) {
            object = this.literalFactory.date(cell);
          } else {
            object = this.dataFactory.literal(cell.value, cell.language);
          }
          break;
        case "string":
          object = (
            this.iriFromString(cell) as Either<Error, Literal | NamedNode>
          ).orDefault(this.dataFactory.literal(cell));
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
