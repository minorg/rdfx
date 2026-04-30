import { beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import N3 from "n3";
import { describe, it } from "vitest";
import { HttpSparqlQueryClient } from "../src/HttpSparqlQueryClient.js";

describe("HttpSparqlQueryClient", () => {
  const sut = new HttpSparqlQueryClient({
    dataFactory: N3.DataFactory,
    endpointUrl: "http://example.com",
  });

  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should make an ASK query", async ({ expect }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    expect(await sut.queryBoolean("ASK")).toStrictEqual(true);
  });

  it("should make a CONSTRUCT query", async ({ expect }) => {
    fetchMocker.mockResponseOnce(
      '<http://example.org/book/book1> <http://purl.org/dc/elements/1.1/title> "SPARQL Tutorial" .\n',
    );
    const quads = await sut.queryQuads("CONSTRUCT");
    expect(quads).toHaveLength(1);
  });

  it("should make a SELECT query", async ({ expect }) => {
    fetchMocker.mockResponseOnce(
      JSON.stringify({
        head: {
          link: ["http://www.w3.org/TR/rdf-sparql-XMLres/example.rq"],
          vars: ["x", "hpage", "name", "mbox", "age", "blurb", "friend"],
        },
        results: {
          bindings: [
            {
              x: { type: "bnode", value: "r1" },

              hpage: { type: "uri", value: "http://work.example.org/alice/" },

              name: { type: "literal", value: "Alice" },

              mbox: { type: "literal", value: "" },

              blurb: {
                datatype:
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral",
                type: "literal",
                value:
                  '<p xmlns="http://www.w3.org/1999/xhtml">My name is <b>alice</b></p>',
              },

              friend: { type: "bnode", value: "r2" },
            },
            {
              x: { type: "bnode", value: "r2" },

              hpage: { type: "uri", value: "http://work.example.org/bob/" },

              name: { type: "literal", value: "Bob", "xml:lang": "en" },

              mbox: { type: "uri", value: "mailto:bob@work.example.org" },

              friend: { type: "bnode", value: "r1" },
            },
          ],
        },
      }),
    );
    const bindings = await sut.queryBindings("SELECT");
    expect(bindings).toHaveLength(2);
    expect(bindings[0]["name"].value).toStrictEqual("Alice");
  });

  it("should use the GET method", async ({ expect }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    expect(await sut.queryBoolean("ASK", { method: "GET" })).toStrictEqual(
      true,
    );
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual("http://example.com/?query=ASK");
    expect(await request.text()).toStrictEqual("");
  });

  it("should use the POST directly method", async ({ expect }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    expect(
      await sut.queryBoolean("ASK", { method: "POSTDirectly" }),
    ).toStrictEqual(true);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual("http://example.com/");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/sparql-query; charset=utf-8",
    );
    expect(await request.text()).toStrictEqual("ASK");
  });

  it("should use the POST with URL-encoded parameters method", async ({
    expect,
  }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    expect(
      await sut.queryBoolean("ASK", { method: "POSTWithUrlEncodedParameters" }),
    ).toStrictEqual(true);
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual("http://example.com/");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/x-www-form-urlencoded",
    );
    expect(await request.text()).toStrictEqual("query=ASK");
  });

  it("should add default graph URIs with request options", async ({
    expect,
  }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    await sut.queryBoolean("ASK", {
      method: "POSTDirectly",
      defaultGraphUris: [N3.DataFactory.namedNode("http://test.com")],
    });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual(
      "http://example.com/?default-graph-uri=http%3A%2F%2Ftest.com",
    );
  });

  it("should add using named graph URIs with default request options", async ({
    expect,
  }) => {
    fetchMocker.mockResponseOnce(JSON.stringify({ boolean: true }));
    await new HttpSparqlQueryClient({
      dataFactory: N3.DataFactory,
      defaultRequestOptions: {
        namedGraphUris: [N3.DataFactory.namedNode("http://test.com")],
      },
      endpointUrl: "http://example.com",
    }).queryBoolean("ASK", {
      method: "POSTDirectly",
    });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual(
      "http://example.com/?named-graph-uri=http%3A%2F%2Ftest.com",
    );
  });
});
