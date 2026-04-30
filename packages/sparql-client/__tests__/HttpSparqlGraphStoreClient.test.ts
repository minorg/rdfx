import { beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { HttpSparqlGraphStoreClient } from "@kos-kit/sparql-client";
import N3 from "n3";
import { describe, it } from "vitest";

describe("HttpSparqlGraphStoreClient", () => {
  const sut = new HttpSparqlGraphStoreClient({
    dataFactory: N3.DataFactory,
    endpointUrl: "http://example.com/",
  });

  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should delete a graph", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await sut.deleteGraph(N3.DataFactory.namedNode("http://test.com"));
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.method).toStrictEqual("DELETE");
    expect(request.url).toStrictEqual(
      "http://example.com/?graph=http%3A%2F%2Ftest.com",
    );
  });

  it("should get a graph", async ({ expect }) => {
    fetchMocker.mockResponseOnce(
      '<http://example.org/book/book1> <http://purl.org/dc/elements/1.1/title> "SPARQL Tutorial" .\n',
    );
    const quads = await sut.getGraph(N3.DataFactory.defaultGraph());
    expect(quads).toHaveLength(1);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.method).toStrictEqual("GET");
    expect(request.headers.get("accept")).toStrictEqual(
      "application/n-triples; charset=utf-8",
    );
    expect(request.url).toStrictEqual("http://example.com/?default=");
  });

  it("should post a graph", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await sut.postGraph(N3.DataFactory.defaultGraph(), [
      N3.DataFactory.quad(
        N3.DataFactory.namedNode("http://example.com/s"),
        N3.DataFactory.namedNode("http://example.com/p"),
        N3.DataFactory.namedNode("http://example.com/o"),
      ),
    ]);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.method).toStrictEqual("POST");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/n-triples; charset=utf-8",
    );
    expect(request.url).toStrictEqual("http://example.com/?default=");
    expect(await request.text()).toStrictEqual(
      "<http://example.com/s> <http://example.com/p> <http://example.com/o> .",
    );
  });

  it("should strip a named graph when posting a graph", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await sut.postGraph(N3.DataFactory.defaultGraph(), [
      N3.DataFactory.quad(
        N3.DataFactory.namedNode("http://example.com/s"),
        N3.DataFactory.namedNode("http://example.com/p"),
        N3.DataFactory.namedNode("http://example.com/o"),
        N3.DataFactory.namedNode("http://example.com/g"),
      ),
    ]);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.method).toStrictEqual("POST");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/n-triples; charset=utf-8",
    );
    expect(request.url).toStrictEqual("http://example.com/?default=");
    expect(await request.text()).toStrictEqual(
      "<http://example.com/s> <http://example.com/p> <http://example.com/o> .",
    );
  });

  it("should put a graph", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await sut.putGraph(N3.DataFactory.defaultGraph(), [
      N3.DataFactory.quad(
        N3.DataFactory.namedNode("http://example.com/s"),
        N3.DataFactory.namedNode("http://example.com/p"),
        N3.DataFactory.namedNode("http://example.com/o"),
      ),
    ]);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.method).toStrictEqual("PUT");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/n-triples; charset=utf-8",
    );
    expect(request.url).toStrictEqual("http://example.com/?default=");
    expect(await request.text()).toStrictEqual(
      "<http://example.com/s> <http://example.com/p> <http://example.com/o> .",
    );
  });
});
