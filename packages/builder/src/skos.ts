import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { Literal, NamedNode } from "@rdfjs/types";
import type { skos_Concept, skos_ConceptScheme } from "./shapes.js";

/** A shallow registry of just $identifiers, safe to pass to broader thunks
 *  since it can be fully constructed before any thunk runs. */
type PartialConceptScheme<T extends Record<string, unknown>> = {
  readonly concepts: {
    readonly [K in keyof T]: { readonly identifier: NamedNode };
  };
  readonly identifier: NamedNode;
};

type PartialConcept<ConceptSchemeT> = Omit<
  skos_Concept,
  "broader" | "identifier" | "notations" | "prefLabel" | "types"
> & {
  readonly broader?:
    | readonly NamedNode[]
    | ((conceptScheme: ConceptSchemeT) => readonly NamedNode[]);
  readonly notation?: Literal | string | true;
  readonly notations?: readonly (Literal | string)[];
  readonly prefLabel?: string;
};

export function skos<NamespaceT extends NamespaceBuilder>({
  namespace,
}: {
  namespace: NamespaceT;
}) {
  return {
    ConceptScheme: <
      ConceptsT extends Record<
        string,
        PartialConcept<PartialConceptScheme<ConceptsT>>
      >,
    >(
      className: string,
      parameters: {
        readonly concepts: ConceptsT;
        readonly definition?: string;
        readonly prefLabel?: string;
      },
    ): skos_ConceptScheme => {
      const partialConcepts = parameters?.concepts;
    },
  };
}
