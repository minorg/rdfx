import type { DefaultGraph, NamedNode, Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import "@rdfx/testing";
import { iterableToStream, streamToArray } from "@rdfx/stream";

import { describe, it } from "vitest";

import type { GraphStore } from "../src/GraphStore.js";

export function testGraphStore(
  withGraphStore: (
    use: (graphStore: GraphStore) => Promise<void>,
  ) => Promise<void>,
) {
  for (const graph of [
    dataFactory.defaultGraph(),
    dataFactory.namedNode("http://example.com/graph"),
  ]) {
    describe(
      graph.termType === "DefaultGraph" ? "default graph" : "named graph",
      () => {
        const quad = (
          index = 0,
          overrideGraph: DefaultGraph | NamedNode = graph,
        ): Quad =>
          dataFactory.quad(
            dataFactory.namedNode(`http://example.com/subject${index}`),
            dataFactory.namedNode(`http://example.com/predicate${index}`),
            dataFactory.namedNode(`http://example.com/object${index}`),
            overrideGraph,
          );

        describe("clear", async () => {
          it("on empty store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
              await sut.clear();
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
              await sut.put(iterableToStream([quad()]));
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(false);
              await sut.clear();
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
            }));
        });

        describe("delete", () => {
          it("on empty store", async () =>
            await withGraphStore(async (sut) => {
              (await sut.delete(graph)).unsafeCoerce();
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              (await sut.put(iterableToStream([quad()]))).unsafeCoerce();
              expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
                true,
              );
              (await sut.delete(graph)).unsafeCoerce();
              expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
                false,
              );
            }));
        });

        describe("get", () => {
          it("on empty store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect(
                (await sut.get(graph)).unsafeCoerce().isNothing(),
              ).toStrictEqual(true);
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              const expectedQuad = quad();
              (await sut.put(iterableToStream([expectedQuad]))).unsafeCoerce();
              const expectedDataset = datasetFactory.dataset([expectedQuad]);
              const actualDataset = datasetFactory.dataset(
                (
                  await streamToArray(
                    (await sut.get(graph)).unsafeCoerce().unsafeCoerce(),
                  )
                )
                  .unsafeCoerce()
                  .concat(),
              );
              expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
            }));
        });

        describe("head", () => {
          it("on empty store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
                false,
              );
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              (await sut.put(iterableToStream([quad()]))).unsafeCoerce();
              expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
                true,
              );
            }));
        });

        describe("identifiers", () => {
          it("on empty store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.identifiers()).unsafeCoerce()).toEqual([]);
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              (await sut.put(iterableToStream([quad()]))).unsafeCoerce();
              expect(
                (await sut.identifiers()).unsafeCoerce(),
              ).toEqualRdfTermArray([graph]);
            }));
        });

        describe("isEmpty", () => {
          it("on empty store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
            }));

          it("on populated store", async ({ expect }) =>
            await withGraphStore(async (sut) => {
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
              (await sut.put(iterableToStream([quad()]))).unsafeCoerce();
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(false);
            }));
        });

        it("post", async ({ expect }) =>
          await withGraphStore(async (sut) => {
            const expectedQuad0 = quad(0);
            const expectedQuad1 = quad(1);

            (await sut.post(iterableToStream([expectedQuad0]))).unsafeCoerce();

            expect(
              (
                await streamToArray(
                  (await sut.get(graph)).unsafeCoerce().unsafeCoerce(),
                )
              ).unsafeCoerce(),
            ).toEqualRdfQuadArray([expectedQuad0]);

            (await sut.post(iterableToStream([expectedQuad1]))).unsafeCoerce();

            expect(
              (
                await streamToArray(
                  (await sut.get(graph)).unsafeCoerce().unsafeCoerce(),
                )
              ).unsafeCoerce(),
            ).toBeRdfIsomorphic([expectedQuad0, expectedQuad1]);
          }));

        it("put", async ({ expect }) =>
          await withGraphStore(async (sut) => {
            const expectedQuad0 = quad(0);
            const expectedQuad1 = quad(1);

            (await sut.put(iterableToStream([expectedQuad0]))).unsafeCoerce();

            expect(
              (
                await streamToArray(
                  (await sut.get(graph)).unsafeCoerce().unsafeCoerce(),
                )
              ).unsafeCoerce(),
            ).toEqualRdfQuadArray([expectedQuad0]);

            (await sut.put(iterableToStream([expectedQuad1]))).unsafeCoerce();

            expect(
              (
                await streamToArray(
                  (await sut.get(graph)).unsafeCoerce().unsafeCoerce(),
                )
              ).unsafeCoerce(),
            ).toEqualRdfQuadArray([expectedQuad1]);
          }));
      },
    );
  }
}
