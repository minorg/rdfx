import { BlankNode, Literal, NamedNode, Quad } from "@rdfjs/types";
import N3 from "n3";
import { LoggingSparqlBaseClient } from "./LoggingSparqlBaseClient.js";
import { SparqlQueryClient } from "./SparqlQueryClient.js";

/**
 * SparqlClient implementation that logs queries and delegates actual work to another SparqlClient implementation.
 */
export class LoggingSparqlQueryClient
  extends LoggingSparqlBaseClient<SparqlQueryClient>
  implements SparqlQueryClient
{
  async queryBindings(
    query: string,
  ): Promise<readonly Record<string, BlankNode | Literal | NamedNode>[]> {
    this.logger(this.loggableQuery(query));
    const result = await this.delegate.queryBindings(query);
    this.logger(
      "queryBindings results:\n%s",
      JSON.stringify(result, undefined, 2),
    );
    return result;
  }

  async queryBoolean(query: string): Promise<boolean> {
    this.logger(this.loggableQuery(query));
    const result = await this.delegate.queryBoolean(query);
    this.logger("queryBoolean result: %s", result);
    return result;
  }

  async queryQuads(query: string): Promise<readonly Quad[]> {
    this.logger(this.loggableQuery(query));
    const result = await this.delegate.queryQuads(query);
    this.logger("queryQuads result: %d quads", result.length);
    // if (this.logger.isLevelEnabled("trace")) {
    const writer = new N3.Writer({ format: "application/N-Quads" });
    for (const quad of result) {
      this.logger(
        writer
          .quadToString(quad.subject, quad.predicate, quad.object, quad.graph)
          .trimEnd(),
      );
    }
    // }
    return result;
  }
}
