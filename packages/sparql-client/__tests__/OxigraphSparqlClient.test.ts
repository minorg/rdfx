import { OxigraphSparqlClient } from "@kos-kit/sparql-client";
import * as oxigraph from "oxigraph";
import { beforeEach, describe, it } from "vitest";

describe("OxigraphSparqlClient", () => {
  let object: oxigraph.Literal;
  let predicate: oxigraph.NamedNode;
  let store: oxigraph.Store;
  let subject: oxigraph.NamedNode;
  let sut: OxigraphSparqlClient;

  beforeEach(() => {
    store = new oxigraph.Store();
    subject = oxigraph.namedNode("http://example.com/subject");
    predicate = oxigraph.namedNode("http://example.com/predicate");
    object = oxigraph.literal("object");
    store.add(oxigraph.quad(subject, predicate, object));
    sut = new OxigraphSparqlClient({ dataFactory: oxigraph, store });
  });

  it("should delete the default graph", async ({ expect }) => {
    expect(store.size).toStrictEqual(1);
    expect(await sut.deleteGraph(oxigraph.defaultGraph())).toStrictEqual(true);
    expect(store.size).toStrictEqual(0);
  });

  it("should delete a named graph", async ({ expect }) => {
    const graph = oxigraph.namedNode("http://example.com/graph");
    const store = new oxigraph.Store();
    const sut = new OxigraphSparqlClient({
      dataFactory: oxigraph,
      store,
    });
    expect(store.size).toStrictEqual(0);
    expect(await sut.deleteGraph(graph)).toStrictEqual(false);
    store.add(oxigraph.quad(subject, predicate, object, graph));
    expect(store.size).toStrictEqual(1);
    const quads = [...store.match(null, null, null, graph)];
    expect(quads).toHaveLength(1);
    expect(quads[0].graph.equals(graph));
    expect(await sut.deleteGraph(graph)).toStrictEqual(true);
    expect(store.size).toStrictEqual(0);
  });

  it("should get a graph", async ({ expect }) => {
    const quads = await sut.getGraph(oxigraph.defaultGraph());
    expect(quads).toHaveLength(1);
    const quad = quads[0]!;
    expect(quad.subject.equals(subject)).toStrictEqual(true);
    expect(quad.predicate.equals(predicate)).toStrictEqual(true);
    expect(quad.object.equals(object)).toStrictEqual(true);
  });

  it("should post a graph", async ({ expect }) => {
    await sut.postGraph(oxigraph.defaultGraph(), [
      oxigraph.quad(subject, predicate, oxigraph.literal("test2")),
    ]);
    expect(store.size).toStrictEqual(2);
  });

  it("should put a graph", async ({ expect }) => {
    await sut.putGraph(oxigraph.defaultGraph(), [
      oxigraph.quad(subject, predicate, oxigraph.literal("test2")),
    ]);
    expect(store.size).toStrictEqual(1);
    const quads = [...store.match()];
    expect(quads).toHaveLength(1);
    const quad = quads[0]!;
    expect(quad.subject.equals(subject)).toStrictEqual(true);
    expect(quad.predicate.equals(predicate)).toStrictEqual(true);
    expect(quad.object.equals(oxigraph.literal("test2"))).toStrictEqual(true);
  });

  it("should query bindings", async ({ expect }) => {
    const result = await sut.queryBindings(
      "SELECT ?s ?p ?o WHERE { ?s ?p ?o }",
    );
    expect(result).toHaveLength(1);
    const resultRow = result[0];
    expect(resultRow["s"].equals(subject)).toStrictEqual(true);
    expect(resultRow["p"].equals(predicate)).toStrictEqual(true);
    expect(resultRow["o"].equals(object)).toStrictEqual(true);
  });

  it("should query boolean", async ({ expect }) => {
    expect(await sut.queryBoolean("ASK { ?s ?p ?o }")).toStrictEqual(true);
  });

  it("should query quads", async ({ expect }) => {
    const quads = await sut.queryQuads("CONSTRUCT WHERE { ?s ?p ?o }");
    expect(quads).toHaveLength(1);
    const quad = quads[0]!;
    expect(quad.subject.equals(subject)).toStrictEqual(true);
    expect(quad.predicate.equals(predicate)).toStrictEqual(true);
    expect(quad.object.equals(object)).toStrictEqual(true);
  });

  it("should update the store", ({ expect }) => {
    expect(store.size).toStrictEqual(1);
    sut.update(
      `INSERT DATA { <${subject.value}> <${predicate.value}> "test2" . }`,
    );
    expect(store.size).toStrictEqual(2);
  });
});
