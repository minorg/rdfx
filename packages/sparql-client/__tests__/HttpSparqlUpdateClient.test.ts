import { beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { HttpSparqlUpdateClient } from "@kos-kit/sparql-client";
import N3 from "n3";
import { describe, it } from "vitest";

describe("HttpSparqlUpdateClient", () => {
  const sut = new HttpSparqlUpdateClient({
    endpointUrl: "http://example.com",
  });

  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should make an update ", async () => {
    fetchMocker.mockResponseOnce("");
    await sut.update("INSERT DATA");
  });

  it("should use the POST directly method", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await sut.update("UPDATE", { method: "POSTDirectly" });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual("http://example.com/");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/sparql-update; charset=utf-8",
    );
    expect(await request.text()).toStrictEqual("UPDATE");
  });

  it("should use the POST with URL-encoded parameters method", async ({
    expect,
  }) => {
    fetchMocker.mockResponseOnce("");
    await sut.update("UPDATE", { method: "POSTWithUrlEncodedParameters" });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual("http://example.com/");
    expect(request.headers.get("content-type")).toStrictEqual(
      "application/x-www-form-urlencoded",
    );
    expect(await request.text()).toStrictEqual("update=UPDATE");
  });

  it("should add using graph URIs with request options", async ({ expect }) => {
    fetchMocker.mockResponseOnce("");
    await new HttpSparqlUpdateClient({
      endpointUrl: "http://example.com",
    }).update("UPDATE", {
      method: "POSTDirectly",
      usingGraphUris: [N3.DataFactory.namedNode("http://test.com")],
    });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual(
      "http://example.com/?using-graph-uri=http%3A%2F%2Ftest.com",
    );
  });

  it("should add using named graph URIs with default request options", async ({
    expect,
  }) => {
    fetchMocker.mockResponseOnce("");
    await new HttpSparqlUpdateClient({
      defaultRequestOptions: {
        usingNamedGraphUris: [N3.DataFactory.namedNode("http://test.com")],
      },
      endpointUrl: "http://example.com",
    }).update("UPDATE", {
      method: "POSTDirectly",
    });
    expect(fetchMocker.requests()).toHaveLength(1);
    const request = fetchMocker.requests()[0];
    expect(request.url).toStrictEqual(
      "http://example.com/?using-named-graph-uri=http%3A%2F%2Ftest.com",
    );
  });
});
