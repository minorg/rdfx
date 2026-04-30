import { LoggingSparqlBaseClient } from "./LoggingSparqlBaseClient.js";
import type { SparqlUpdateClient } from "./SparqlUpdateClient.js";

/**
 * SparqlClient implementation that logs queries and delegates actual work to another SparqlClient implementation.
 */
export class LoggingSparqlUpdateClient
  extends LoggingSparqlBaseClient<SparqlUpdateClient>
  implements SparqlUpdateClient
{
  async update(update: string): Promise<void> {
    this.logger(this.loggableQuery(update));
    await this.delegate.update(update);
    this.logger("SPARQL update executed successfully");
  }
}
