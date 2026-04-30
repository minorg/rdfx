import { BlankNode, DataFactory, Literal, NamedNode, Quad } from "@rdfjs/types";
import N3 from "n3";
import { HttpSparqlBaseClient } from "./HttpSparqlBaseClient.js";
import { SparqlQueryClient } from "./SparqlQueryClient.js";

export class HttpSparqlQueryClient
  extends HttpSparqlBaseClient<HttpSparqlQueryClient.RequestOptions>
  implements SparqlQueryClient
{
  private readonly dataFactory: DataFactory;

  constructor({
    dataFactory,
    ...superParameters
  }: HttpSparqlQueryClient.Parameters) {
    super(superParameters);
    this.dataFactory = dataFactory;
  }

  async queryBindings(
    query: string,
    options?: HttpSparqlQueryClient.RequestOptions,
  ): Promise<readonly Record<string, BlankNode | Literal | NamedNode>[]> {
    const response = await this.request(
      query,
      {
        accept: "application/sparql-results+json",
      },
      options,
    );
    // https://www.w3.org/TR/sparql11-results-json/
    const json = (await response.json()) as {
      readonly head: {
        readonly vars: readonly string[];
      };
      readonly results: {
        readonly bindings: readonly Record<
          string,
          | {
              type: "bnode";
              value: string;
            }
          | {
              datatype?: string;
              type: "literal" | "typed-literal";
              value: string;
              "xml:lang"?: string;
            }
          | {
              type: "uri";
              value: string;
            }
        >[];
      };
    };
    return json.results.bindings.map((jsonResultsBindings) => {
      const rdfjsBinding: Record<string, BlankNode | Literal | NamedNode> = {};
      for (const [key, value] of Object.entries(jsonResultsBindings)) {
        switch (value.type) {
          case "bnode":
            rdfjsBinding[key] = this.dataFactory.blankNode(value.value);
            break;
          case "literal":
            if (value.datatype) {
              rdfjsBinding[key] = this.dataFactory.literal(
                value.value,
                this.dataFactory.namedNode(value.datatype),
              );
            } else {
              rdfjsBinding[key] = this.dataFactory.literal(
                value.value,
                value["xml:lang"],
              );
            }
            break;
          case "uri":
            rdfjsBinding[key] = this.dataFactory.namedNode(value.value);
            break;
        }
      }
      return rdfjsBinding;
    });
  }

  async queryBoolean(
    query: string,
    options?: HttpSparqlQueryClient.RequestOptions,
  ): Promise<boolean> {
    const response = await this.request(
      query,
      {
        accept: "application/sparql-results+json",
      },
      options,
    );
    return ((await response.json()) as any).boolean;
  }

  async queryQuads(
    query: string,
    options?: HttpSparqlQueryClient.RequestOptions,
  ): Promise<readonly Quad[]> {
    const response = await this.request(
      query,
      {
        accept: "application/n-triples",
      },
      options,
    );
    return new N3.Parser({
      factory: this.dataFactory,
      format: "application/n-triples",
    }).parse(await response.text());
  }

  private async request(
    query: string,
    { accept }: { accept: string },
    options?: HttpSparqlQueryClient.RequestOptions,
  ): Promise<Response> {
    const method =
      options?.method ?? this.defaultRequestOptions?.method ?? "GET";

    const url = new URL(this.endpointUrl);
    switch (method) {
      case "GET": {
        url.searchParams.set("query", query);
        this.requestOptionsToUrlSearchParams(url.searchParams, options);

        return await this.ensureOkResponse(
          await this.fetch({
            body: null,
            hardCodedHeaders: { accept, contentType: null },
            method: "GET",
            options: options ?? null,
            url,
          }),
        );
      }
      case "POSTDirectly": {
        this.requestOptionsToUrlSearchParams(url.searchParams, options);

        return await this.ensureOkResponse(
          await this.fetch({
            body: query,
            hardCodedHeaders: {
              accept,
              contentType: "application/sparql-query; charset=utf-8",
            },
            method: "POST",
            options: options ?? null,
            url,
          }),
        );
      }
      case "POSTWithUrlEncodedParameters": {
        const urlEncodedParameters = new URLSearchParams();
        this.requestOptionsToUrlSearchParams(urlEncodedParameters, options);
        urlEncodedParameters.set("query", query);

        return await this.ensureOkResponse(
          await this.fetch({
            body: urlEncodedParameters,
            hardCodedHeaders: {
              accept,
              contentType: "application/x-www-form-urlencoded",
            },
            method: "POST",
            options: options ?? null,
            url,
          }),
        );
      }
    }
  }

  private requestOptionsToUrlSearchParams(
    urlSearchParams: URLSearchParams,
    requestOptions?: HttpSparqlQueryClient.RequestOptions,
  ): void {
    for (const defaultGraphUri of requestOptions?.defaultGraphUris ??
      this.defaultRequestOptions?.defaultGraphUris ??
      []) {
      urlSearchParams.append("default-graph-uri", defaultGraphUri.value);
    }

    for (const namedGraphUri of requestOptions?.namedGraphUris ??
      this.defaultRequestOptions?.namedGraphUris ??
      []) {
      urlSearchParams.append("named-graph-uri", namedGraphUri.value);
    }

    if (
      requestOptions?.unionDefaultGraph ??
      this.defaultRequestOptions?.unionDefaultGraph ??
      false
    ) {
      urlSearchParams.append("union-default-graph", "");
    }
  }
}

export namespace HttpSparqlQueryClient {
  export interface Parameters
    extends HttpSparqlBaseClient.Parameters<RequestOptions> {
    dataFactory: DataFactory;
  }

  export interface RequestOptions extends HttpSparqlBaseClient.RequestOptions {
    defaultGraphUris?: readonly NamedNode[];
    method?: "GET" | "POSTDirectly" | "POSTWithUrlEncodedParameters";
    namedGraphUris?: readonly NamedNode[];
    unionDefaultGraph?: boolean; // Oxigraph extension
  }
}
