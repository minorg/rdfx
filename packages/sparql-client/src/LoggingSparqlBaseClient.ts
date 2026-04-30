import { SparqlGraphStoreClient } from "./SparqlGraphStoreClient.js";
import { SparqlQueryClient } from "./SparqlQueryClient.js";
import { SparqlUpdateClient } from "./SparqlUpdateClient.js";

type Logger = (
  message: string,
  ...parameters: (boolean | number | string)[]
) => void;

export class LoggingSparqlBaseClient<
  DelegateT extends
    | SparqlGraphStoreClient
    | SparqlQueryClient
    | SparqlUpdateClient,
> {
  protected delegate: DelegateT;
  protected logger: Logger;

  constructor({ delegate, logger }: { delegate: DelegateT; logger: Logger }) {
    this.delegate = delegate;
    this.logger = logger;
  }

  protected loggableQuery(query: string): string {
    return query.replace(/\s+/g, " ").trim();
  }
}
