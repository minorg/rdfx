import { BlankNode, Literal, NamedNode, Quad } from "@rdfjs/types";

/**
 * SPARQL 1.1 Protocol query operations (https://www.w3.org/TR/2013/REC-sparql11-protocol-20130321/#query-operation).
 *
 * Loosely modeled on the RDF/JS: Query specification (https://rdf.js.org/query-spec/#queryquads-interface),
 * returning arrays rather than streams.
 */
export interface SparqlQueryClient {
  /**
   * SELECT queries.
   */
  queryBindings(
    query: string,
  ): Promise<readonly Record<string, BlankNode | Literal | NamedNode>[]>;

  /**
   * ASK queries.
   */
  queryBoolean(query: string): Promise<boolean>;

  /**
   * CONSTRUCT or DESCRIBE queries
   */
  queryQuads(query: string): Promise<readonly Quad[]>;
}
