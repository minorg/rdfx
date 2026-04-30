import {
  BlankNode,
  DataFactory,
  DefaultGraph,
  Literal,
  NamedNode,
  Quad,
  Term,
} from "@rdfjs/types";
import { SparqlGraphStoreClient } from "./SparqlGraphStoreClient.js";
import { SparqlQueryClient } from "./SparqlQueryClient.js";
import { SparqlUpdateClient } from "./SparqlUpdateClient.js";

// Re-declare the parts of oxigraph.Store we need in order to avoid an explicit dependency on oxigraph.
interface Store {
  add(quad: Quad): void;

  match(
    subject?: Term | null,
    predicate?: Term | null,
    object?: Term | null,
    graph?: Term | null,
  ): Quad[];

  query(
    query: string,
    options?: {
      base_iri?: NamedNode | string;
      results_format?: string;
      use_default_graph_as_union?: boolean;
    },
  ): boolean | Map<string, Term>[] | Quad[] | string;

  update(
    update: string,
    options?: {
      base_iri?: NamedNode | string;
    },
  ): void;
}

export class OxigraphSparqlClient
  implements SparqlGraphStoreClient, SparqlQueryClient, SparqlUpdateClient
{
  private readonly dataFactory: Pick<DataFactory, "quad">;
  private readonly store: Store;
  private readonly useDefaultGraphAsUnion: boolean;

  constructor({
    dataFactory,
    store,
    useDefaultGraphAsUnion,
  }: {
    dataFactory: Pick<DataFactory, "quad">;
    store: Store;
    useDefaultGraphAsUnion?: boolean;
  }) {
    this.dataFactory = dataFactory;
    this.store = store;
    this.useDefaultGraphAsUnion = !!useDefaultGraphAsUnion;
  }

  async deleteGraph(graph: DefaultGraph | NamedNode): Promise<boolean> {
    // https://www.w3.org/TR/2013/REC-sparql11-http-rdf-update-20130321/#http-put
    if (graph.termType === "DefaultGraph") {
      this.store.update("DROP SILENT DEFAULT");
      return true;
    }

    try {
      this.store.update(`DROP GRAPH <${graph.value}>`);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message.endsWith("does not exist")) {
        return false;
      }
      throw e;
    }
  }

  async getGraph(graph: DefaultGraph | NamedNode): Promise<readonly Quad[]> {
    return [...this.store.match(null, null, null, graph)];
  }

  async postGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Quad>,
  ): Promise<void> {
    for (const quad of payload) {
      this.store.add(
        this.dataFactory.quad(quad.subject, quad.predicate, quad.object, graph),
      );
    }
  }

  async putGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Quad>,
  ): Promise<void> {
    await this.deleteGraph(graph);
    await this.postGraph(graph, payload);
  }

  async queryBindings(
    query: string,
  ): Promise<readonly Record<string, BlankNode | Literal | NamedNode>[]> {
    const bindings: Record<string, BlankNode | Literal | NamedNode>[] = [];
    for (const map of this.store.query(query, {
      use_default_graph_as_union: this.useDefaultGraphAsUnion,
    }) as Map<string, Term>[]) {
      const mapBindings: Record<string, BlankNode | Literal | NamedNode> = {};
      for (const entry of map.entries()) {
        switch (entry[1].termType) {
          case "BlankNode":
          case "Literal":
          case "NamedNode":
            mapBindings[entry[0]] = entry[1];
            break;
          default:
            throw new RangeError(entry[1].termType);
        }
      }
      bindings.push(mapBindings);
    }
    return bindings;
  }

  async queryBoolean(query: string): Promise<boolean> {
    return this.store.query(query, {
      use_default_graph_as_union: this.useDefaultGraphAsUnion,
    }) as boolean;
  }

  async queryQuads(query: string): Promise<readonly Quad[]> {
    return this.store.query(query, {
      use_default_graph_as_union: this.useDefaultGraphAsUnion,
    }) as Quad[];
  }

  async update(update: string) {
    this.store.update(update, {});
  }
}
