import type { BaseQuad, DefaultGraph, NamedNode, Quad } from "@rdfjs/types";
import { datasetFactory } from "@rdfx/collection";
import dataFactory from "@rdfx/data-factory";
import "@rdfx/testing";

import type { Readable } from "node:stream";
import { getStreamAsArray } from "get-stream";
import intoStream from "into-stream";
import { describe, it } from "vitest";
import type { VersionedGraphStore } from "../src/VersionedGraphStore.js";
// import { testGraphStore } from "./testGraphStore.js";

export function testVersionedGraphStore<VersionT>(
  nonExtantVersion: VersionT,
  withVersionedGraphStore: (
    use: (versionedGraphStore: VersionedGraphStore<VersionT>) => Promise<void>,
  ) => Promise<void>,
) {
  // testGraphStore(withVersionedGraphStore);

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

        it("clear", async ({ expect }) => {
          await withVersionedGraphStore(async (sut) => {
            const { version: versionAfterPut } = (
              await sut.put(intoStream.object([quad()]))
            ).unsafeCoerce();

            const { version: versionAfterClear } = (
              await sut.clear()
            ).unsafeCoerce();

            expect(versionAfterClear).not.toEqual(versionAfterPut);
          });
        });

        it("delete", async ({ expect }) => {
          await withVersionedGraphStore(async (sut) => {
            const { version: versionAfterPut } = (
              await sut.put(intoStream.object([quad()]))
            ).unsafeCoerce();

            const { version: versionAfterDelete } = (
              await sut.delete(graph)
            ).unsafeCoerce();

            expect(versionAfterDelete).not.toEqual(versionAfterPut);
          });
        });

        describe("get", () => {
          it("version on empty store", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              expect(
                (await sut.get(graph, { version: nonExtantVersion }))
                  .unsafeCoerce()
                  .isNothing(),
              ).toStrictEqual(true);
            }));

          it("version that didn't come back from write", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              (await sut.put(intoStream.object([quad()]))).unsafeCoerce();

              expect(
                (await sut.get(graph, { version: nonExtantVersion }))
                  .unsafeCoerce()
                  .isNothing(),
              ).toStrictEqual(true);
            }));

          it("version returned by delete", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              (await sut.put(intoStream.object([quad()]))).unsafeCoerce();

              const { version: versionAfterDelete } = (
                await sut.delete(graph)
              ).unsafeCoerce();

              expect(
                (await sut.get(graph, { version: versionAfterDelete }))
                  .unsafeCoerce()
                  .isNothing(),
              ).toStrictEqual(true);
            }));

          it("version returned by put", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              const expectedQuad = quad();
              const { version: versionAfterPut } = (
                await sut.put(intoStream.object([expectedQuad]))
              ).unsafeCoerce();

              const expectedDataset = datasetFactory.dataset([expectedQuad]);
              const actualDataset = datasetFactory.dataset(
                (await getStreamAsArray(
                  (
                    await sut.get(graph, { version: versionAfterPut })
                  )
                    .unsafeCoerce()
                    .unsafeCoerce() as Readable,
                )) as BaseQuad[],
              );
              expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
            }));

          it("version returned by put, after delete", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              const expectedQuad = quad();
              const { version: versionAfterPut } = (
                await sut.put(intoStream.object([expectedQuad]))
              ).unsafeCoerce();

              (await sut.delete(graph)).unsafeCoerce();
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);

              const expectedDataset = datasetFactory.dataset([expectedQuad]);
              const actualDataset = datasetFactory.dataset(
                (await getStreamAsArray(
                  (
                    await sut.get(graph, { version: versionAfterPut })
                  )
                    .unsafeCoerce()
                    .unsafeCoerce() as Readable,
                )) as BaseQuad[],
              );
              expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
            }));
        });

        describe("head", () => {
          it("version on empty store", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              expect(
                (
                  await sut.head(graph, {
                    version: nonExtantVersion,
                  })
                ).unsafeCoerce(),
              ).toStrictEqual(false);
            }));

          it("version that didn't come back from write", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              (await sut.put(intoStream.object([quad()]))).unsafeCoerce();

              expect(
                (
                  await sut.head(graph, {
                    version: nonExtantVersion,
                  })
                ).unsafeCoerce(),
              ).toStrictEqual(false);
            }));

          it("version returned by delete", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              (await sut.put(intoStream.object([quad()]))).unsafeCoerce();

              const { version: versionAfterDelete } = (
                await sut.delete(graph)
              ).unsafeCoerce();

              expect(
                (
                  await sut.head(graph, { version: versionAfterDelete })
                ).unsafeCoerce(),
              ).toStrictEqual(false);
            }));

          it("version returned by put", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              const expectedQuad = quad();
              const { version: versionAfterPut } = (
                await sut.put(intoStream.object([expectedQuad]))
              ).unsafeCoerce();
              expect(
                (
                  await sut.head(graph, { version: versionAfterPut })
                ).unsafeCoerce(),
              ).toStrictEqual(true);
            }));

          it("version returned by put, after delete", async ({ expect }) =>
            await withVersionedGraphStore(async (sut) => {
              const { version: versionAfterPut } = (
                await sut.put(intoStream.object([quad()]))
              ).unsafeCoerce();

              (await sut.delete(graph)).unsafeCoerce();
              expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);

              expect(
                (
                  await sut.head(graph, { version: versionAfterPut })
                ).unsafeCoerce(),
              ).toStrictEqual(true);
            }));
        });
      },
    );
  }
}
