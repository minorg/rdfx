export { builder as default } from "./builder.js";

import type { DatasetCore } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { ResourceSet } from "@rdfx/resource";
import {
  $Object,
  type owl_Ontology,
  type sh_NodeShape,
  type sh_PropertyGroup,
  type sh_PropertyShape,
  type sh_Shape,
  type skos_Concept,
  type skos_ConceptScheme,
} from "./shapes.js";

export namespace owl {
  export type Ontology = owl_Ontology;
}

export namespace sh {
  export type NodeShape = sh_NodeShape;
  export type PropertyGroup = sh_PropertyGroup;
  export type PropertyShape = sh_PropertyShape;
  export type Shape = sh_Shape;
}

export namespace skos {
  export type Concept = skos_Concept;
  export type ConceptScheme = skos_ConceptScheme;
}

export function toRdfDataset(
  dataset: DatasetCore,
  ...objects: readonly $Object[]
): void {
  const resourceSet = new ResourceSet({ dataFactory, dataset });
  for (const object of objects) {
    $Object.toRdfResource(object, { resourceSet });
  }
}

export const toRdfResource = $Object.toRdfResource;
