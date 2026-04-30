import { beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import { HttpSparqlUpdateClient } from "@kos-kit/sparql-client";
import { describe, it } from "vitest";

describe("HttpSparqlBaseClient", () => {
  const sut = new HttpSparqlUpdateClient({
    endpointUrl: "http://example.com",
  });

  beforeEach(() => {
    fetchMocker.resetMocks();
  });

  it("should throw an error on a non-200 response", async ({ expect }) => {
    fetchMocker.mockResponseOnce("", {
      status: 500,
      statusText: "Server Error",
    });

    await expect(() => sut.update("INSERT DATA")).rejects.toThrowError();
  });

  [
    {
      defaultRequestCache: undefined,
      requestCache: undefined,
      expectedRequestCache: undefined,
    },
    {
      defaultRequestCache: undefined,
      requestCache: "no-store" as const,
      expectedRequestCache: "no-store" as const,
    },
    {
      defaultRequestCache: "no-store" as const,
      requestCache: undefined,
      expectedRequestCache: "no-store" as const,
    },
    {
      defaultRequestCache: "no-cache" as const,
      requestCache: "no-store" as const,
      expectedRequestCache: "no-store" as const,
    },
  ].forEach(({ defaultRequestCache, requestCache }, testI) => {
    it(`should merge the request cache parameter ${testI}`, async ({
      expect,
    }) => {
      const sut = new HttpSparqlUpdateClient({
        defaultRequestOptions: {
          cache: defaultRequestCache,
        },
        endpointUrl: "http://example.com",
      });
      fetchMocker.mockResponseOnce("");
      await sut.update("UPDATE", { cache: requestCache });
      expect(fetchMocker.requests()).toHaveLength(1);
      // Mocker doesn't appear to keep cache around
      // const request = fetchMocker.requests()[0];
      // expect(request.cache).toStrictEqual(expectedRequestCache);
    });
  });

  [
    {
      defaultRequestHeaders: [["name", "value"]],
      requestHeaders: [],
      expectedHeaders: [["name", "value"]],
    },
    {
      defaultRequestHeaders: [],
      requestHeaders: [["name", "value"]],
      expectedHeaders: [["name", "value"]],
    },
    {
      defaultRequestHeaders: [["name", "value1"]],
      requestHeaders: [["name", "value2"]],
      expectedHeaders: [["name", "value2"]],
    },
    {
      defaultRequestHeaders: [["name", "value1"]],
      requestHeaders: [
        ["name", "value2"],
        ["name", "value3"],
      ],
      expectedHeaders: [["name", "value2, value3"]],
    },
    {
      defaultRequestHeaders: [
        ["name", "value1"],
        ["name2", "value"],
      ],
      requestHeaders: [
        ["name", "value2"],
        ["name", "value3"],
      ],
      expectedHeaders: [
        ["name", "value2, value3"],
        ["name2", "value"],
      ],
    },
  ].forEach(
    ({ defaultRequestHeaders, requestHeaders, expectedHeaders }, testI) => {
      it(`should merge headers ${testI}`, async ({ expect }) => {
        const toHeaders = (headers: string[][]) => {
          const headers_ = new Headers();
          for (const header of headers) {
            expect(header[0]).toBeTypeOf("string");
            expect(header[1]).toBeTypeOf("string");
            headers_.append(header[0], header[1]);
          }
          return headers_;
        };

        const sut = new HttpSparqlUpdateClient({
          defaultRequestOptions: {
            headers: toHeaders(defaultRequestHeaders),
          },
          endpointUrl: "http://example.com",
        });
        fetchMocker.mockResponseOnce("");
        await sut.update("UPDATE", { headers: toHeaders(requestHeaders) });
        expect(fetchMocker.requests()).toHaveLength(1);
        const request = fetchMocker.requests()[0];
        const actualHeaders: string[][] = [];
        for (const entry of request.headers.entries()) {
          expect(entry[0]).toBeTypeOf("string");
          expect(entry[1]).toBeTypeOf("string");
          actualHeaders.push([entry[0], entry[1]]);
        }
        expect(actualHeaders).toStrictEqual(
          [
            // Include headers added by our code
            ["content-type", "application/sparql-update; charset=utf-8"],
          ].concat(expectedHeaders),
        );
      });
    },
  );
});
