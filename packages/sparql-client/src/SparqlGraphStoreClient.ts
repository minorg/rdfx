import { DefaultGraph, NamedNode, Quad } from "@rdfjs/types";

export interface SparqlGraphStoreClient {
  /**
   * Delete a graph.
   *
   * https://www.w3.org/TR/sparql11-http-rdf-update/#http-delete
   *
   * @param graph name of the graph or the default graph
   * @return true on a 20x response, false on a 404 response
   * @throw on any other response status
   */
  deleteGraph(graph: DefaultGraph | NamedNode): Promise<boolean>;

  /**
   * Get the triples in a graph.
   *
   * https://www.w3.org/TR/sparql11-http-rdf-update/#http-get
   *
   * @param graph name of the graph or the default graph
   */
  getGraph(graph: DefaultGraph | NamedNode): Promise<readonly Quad[]>;

  /**
   * Post triples to a graph.
   *
   * https://www.w3.org/TR/sparql11-http-rdf-update/#http-post
   *
   * Ignores the graph part of every quad in the payload.
   *
   * @param graph name of the graph or the default graph
   * @param payload iterable of triples
   */
  postGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Omit<Quad, "graph">>,
  ): Promise<void>;

  /**
   * Replace the contents of a graph with the given triples.
   *
   * https://www.w3.org/TR/sparql11-http-rdf-update/#http-put
   *
   * Ignores the graph part of every quad in the payload.
   *
   * @param graph name of the
   * @param payload
   */
  putGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Quad>,
  ): Promise<void>;
}
