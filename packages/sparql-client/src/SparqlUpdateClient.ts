/**
 * SPARQL 1.1 Protocol update operation (https://www.w3.org/TR/2013/REC-sparql11-protocol-20130321/#update-operation).
 */
export interface SparqlUpdateClient {
  update(update: string): Promise<void>;
}
