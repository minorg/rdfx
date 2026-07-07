import namespace, { type NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";

interface ExCbox {
  "": NamedNode<"http://example.com/cbox/">;
  ConceptScheme: NamedNode<"http://example.com/cbox/ConceptScheme">;
  LeafConcept: NamedNode<"http://example.com/cbox/LeafConcept">;
  TopConcept: NamedNode<"http://example.com/cbox/TopConcept">;
}

export const exCbox = namespace("http://example.com/cbox/", {
  factory: dataFactory,
}) as NamespaceBuilder<keyof ExCbox> & ExCbox;

interface ExTbox {
  "": NamedNode<"http://example.com/tbox#">;
  Class: NamedNode<"http://example.com/tbox#Class">;
  property: NamedNode<"http://example.com/tbox#property">;
  XoneMember1: NamedNode<"http://example.com/tbox#XoneMember1">;
  XoneMember2: NamedNode<"http://example.com/tbox#XoneMember2">;
}

export const exTbox = namespace("http://example.com/tbox#", {
  factory: dataFactory,
}) as NamespaceBuilder<keyof ExTbox> & ExTbox;
