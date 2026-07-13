import type { DefaultGraph, NamedNode, Quad } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import "@rdfx/testing";

import intoStream from "into-stream";
import { describe, it } from "vitest";

import type { VersionedGraphStore } from "../src/VersionedGraphStore.js";
import { testGraphStore } from "./testGraphStore.js";

export function testVersionedGraphStore<VersionT>(
  withVersionedGraphStore: (
    use: (versionedGraphStore: VersionedGraphStore<VersionT>) => Promise<void>,
  ) => Promise<void>,
) {
  testGraphStore(withVersionedGraphStore);

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

        // describe("delete", () => {
        //   it("on empty store", async () =>
        //     await withVersionedGraphStore(async (sut) => {
        //       (await sut.delete(graph)).unsafeCoerce();
        //     }));

        //   it("on populated store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       (await sut.put(intoStream.object([quad()]))).unsafeCoerce();
        //       expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
        //         true,
        //       );
        //       (await sut.delete(graph)).unsafeCoerce();
        //       expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
        //         false,
        //       );
        //     }));
        // });

        // describe("get", () => {
        //   it("on empty store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       expect(
        //         (await sut.get(graph)).unsafeCoerce().isNothing(),
        //       ).toStrictEqual(true);
        //     }));

        //   it("on populated store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       const expectedQuad = quad();
        //       (await sut.put(intoStream.object([expectedQuad]))).unsafeCoerce();
        //       const expectedDataset = datasetFactory.dataset([expectedQuad]);
        //       const actualDataset = datasetFactory.dataset(
        //         (await getStreamAsArray(
        //           (
        //             await sut.get(graph)
        //           )
        //             .unsafeCoerce()
        //             .unsafeCoerce() as Readable,
        //         )) as BaseQuad[],
        //       );
        //       expect(actualDataset).toBeRdfIsomorphic(expectedDataset);
        //     }));
        // });

        // describe("head", () => {
        //   it("on empty store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
        //         false,
        //       );
        //     }));

        //   it("on populated store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       (await sut.put(intoStream.object([quad()]))).unsafeCoerce();
        //       expect((await sut.head(graph)).unsafeCoerce()).toStrictEqual(
        //         true,
        //       );
        //     }));
        // });

        // describe("identifiers", () => {
        //   it("on empty store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       expect((await sut.identifiers()).unsafeCoerce()).toEqual([]);
        //     }));

        //   it("on populated store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       (await sut.put(intoStream.object([quad()]))).unsafeCoerce();
        //       expect(
        //         (await sut.identifiers()).unsafeCoerce(),
        //       ).toEqualRdfTermArray([graph]);
        //     }));
        // });

        // describe("isEmpty", () => {
        //   it("on empty store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
        //     }));

        //   it("on populated store", async ({ expect }) =>
        //     await withVersionedGraphStore(async (sut) => {
        //       expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(true);
        //       (await sut.put(intoStream.object([quad()]))).unsafeCoerce();
        //       expect((await sut.isEmpty()).unsafeCoerce()).toStrictEqual(false);
        //     }));
        // });

        // it("post", async ({ expect }) =>
        //   await withVersionedGraphStore(async (sut) => {
        //     const expectedQuad0 = quad(0);
        //     const expectedQuad1 = quad(1);

        //     (await sut.post(intoStream.object([expectedQuad0]))).unsafeCoerce();

        //     expect(
        //       (await getStreamAsArray(
        //         (
        //           await sut.get(graph)
        //         )
        //           .unsafeCoerce()
        //           .unsafeCoerce() as Readable,
        //       )) as Quad[],
        //     ).toEqualRdfQuadArray([expectedQuad0]);

        //     (await sut.post(intoStream.object([expectedQuad1]))).unsafeCoerce();

        //     expect(
        //       (await getStreamAsArray(
        //         (
        //           await sut.get(graph)
        //         )
        //           .unsafeCoerce()
        //           .unsafeCoerce() as Readable,
        //       )) as Quad[],
        //     ).toBeRdfIsomorphic([expectedQuad0, expectedQuad1]);
        //   }));

        // it("put", async ({ expect }) =>
        //   await withVersionedGraphStore(async (sut) => {
        //     const expectedQuad0 = quad(0);
        //     const expectedQuad1 = quad(1);

        //     (await sut.put(intoStream.object([expectedQuad0]))).unsafeCoerce();

        //     expect(
        //       (await getStreamAsArray(
        //         (
        //           await sut.get(graph)
        //         )
        //           .unsafeCoerce()
        //           .unsafeCoerce() as Readable,
        //       )) as Quad[],
        //     ).toEqualRdfQuadArray([expectedQuad0]);

        //     (await sut.put(intoStream.object([expectedQuad1]))).unsafeCoerce();

        //     expect(
        //       (await getStreamAsArray(
        //         (
        //           await sut.get(graph)
        //         )
        //           .unsafeCoerce()
        //           .unsafeCoerce() as Readable,
        //       )) as Quad[],
        //     ).toEqualRdfQuadArray([expectedQuad1]);
        //   }));
      },
    );
  }
}
