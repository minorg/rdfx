import { DataFactory, DefaultGraph, NamedNode, Quad } from "@rdfjs/types";
import N3 from "n3";
import { HttpSparqlBaseClient } from "./HttpSparqlBaseClient.js";
import { SparqlGraphStoreClient } from "./SparqlGraphStoreClient.js";

export class HttpSparqlGraphStoreClient
  extends HttpSparqlBaseClient<HttpSparqlGraphStoreClient.RequestOptions>
  implements SparqlGraphStoreClient
{
  private readonly dataFactory: DataFactory;

  constructor({
    dataFactory,
    ...superParameters
  }: HttpSparqlGraphStoreClient.Parameters) {
    super(superParameters);
    this.dataFactory = dataFactory;
  }

  async deleteGraph(
    graph: DefaultGraph | NamedNode,
    options?: HttpSparqlGraphStoreClient.RequestOptions,
  ): Promise<boolean> {
    const response = await this.fetch({
      body: null,
      hardCodedHeaders: null,
      method: "DELETE",
      options: options ?? null,
      url: this.graphUrl(graph),
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 404) {
      return false;
    }
    throw await this.responseToError(response);
  }

  async getGraph(
    graph: DefaultGraph | NamedNode,
    options?: HttpSparqlGraphStoreClient.RequestOptions,
  ): Promise<readonly Quad[]> {
    const response = await this.fetch({
      body: null,
      hardCodedHeaders: {
        accept: "application/n-triples; charset=utf-8",
        contentType: null,
      },
      method: "GET",
      options: options ?? null,
      url: this.graphUrl(graph),
    });
    if (response.ok) {
      return new N3.Parser({
        factory: this.dataFactory,
        format: "application/n-triples",
      }).parse(await response.text());
    }
    if (response.status === 404) {
      return [];
    }
    throw await this.responseToError(response);
  }

  async postGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Quad>,
    options?: HttpSparqlGraphStoreClient.RequestOptions,
  ): Promise<void> {
    return this.postOrPutGraph(graph, "POST", payload, options);
  }

  async putGraph(
    graph: DefaultGraph | NamedNode,
    payload: Iterable<Quad>,
    options?: HttpSparqlGraphStoreClient.RequestOptions,
  ): Promise<void> {
    return this.postOrPutGraph(graph, "PUT", payload, options);
  }

  private graphUrl(graph: DefaultGraph | NamedNode): URL {
    const url = new URL(this.endpointUrl);
    switch (graph.termType) {
      case "DefaultGraph":
        url.searchParams.append("default", "");
        break;
      case "NamedNode":
        url.searchParams.append("graph", graph.value);
        break;
    }
    return url;
  }

  private async postOrPutGraph(
    graph: DefaultGraph | NamedNode,
    method: "POST" | "PUT",
    payload: Iterable<Quad>,
    options?: HttpSparqlGraphStoreClient.RequestOptions,
  ): Promise<void> {
    // Strip named graphs out of the payload quads, since everything should go to the same graph.
    const quads: Quad[] = [];
    for (const quad of payload) {
      if (quad.graph.termType === "DefaultGraph") {
        quads.push(quad);
      } else {
        quads.push(
          this.dataFactory.quad(quad.subject, quad.predicate, quad.object),
        );
      }
    }

    await this.ensureOkResponse(
      await this.fetch({
        body: new N3.Writer({
          format: "application/n-triples",
        })
          .quadsToString(quads)
          .trimEnd(),
        hardCodedHeaders: {
          accept: null,
          contentType: "application/n-triples; charset=utf-8",
        },
        method,
        options: options ?? null,
        url: this.graphUrl(graph),
      }),
    );
  }
}

export namespace HttpSparqlGraphStoreClient {
  export interface Parameters
    extends HttpSparqlBaseClient.Parameters<RequestOptions> {
    dataFactory: DataFactory;
  }

  export type RequestOptions = HttpSparqlBaseClient.RequestOptions;
}
