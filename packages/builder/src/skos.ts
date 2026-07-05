import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { skos_Concept, skos_ConceptScheme } from "./shapes.js";
import { toIri } from "./toIri.js";

interface ConvertibleConceptParameters<ConceptIriString extends string>
  extends Omit<
    Parameters<typeof skos_Concept.createUnsafe>[0],
    "$identifier" | "broader" | "termType"
  > {
  readonly broader?: ConvertibleRelatedConcepts<ConceptIriString>;
}

type ConvertibleRelatedConcepts<ConceptIriString> =
  | ConceptIriString
  | NamedNode
  | skos_Concept
  | readonly (ConceptIriString | NamedNode | skos_Concept)[];

function convertRelatedConcepts<ConceptIriString extends string>(
  relatedConcepts: ConvertibleRelatedConcepts<ConceptIriString> | undefined,
  toIri: (conceptIriString: ConceptIriString) => NamedNode,
): readonly (NamedNode | skos_Concept)[] {
  if (!relatedConcepts) {
    return [];
  }

  return (
    (Array.isArray(relatedConcepts)
      ? relatedConcepts
      : [relatedConcepts]) as readonly (
      | ConceptIriString
      | NamedNode
      | skos_Concept
    )[]
  ).map((relatedConcept) => {
    if (typeof relatedConcept === "string") {
      return toIri(relatedConcept);
    }
    return relatedConcept as NamedNode | skos_Concept;
  });
}

export function skos<NamespaceT extends NamespaceBuilder>({
  namespace,
}: {
  namespace: NamespaceT;
}) {
  type NamespaceKeyT = keyof NamespaceT & string;

  function Concept(
    $identifier: NamedNode | NamespaceKeyT,
    parameters?: ConvertibleConceptParameters<NamespaceKeyT>,
  ): skos_Concept {
    const { broader: broaderParameter, ...otherParameters } = parameters ?? {};

    return skos_Concept.createUnsafe({
      ...otherParameters,
      $identifier: toIri($identifier, namespace),
      broader: convertRelatedConcepts<NamespaceKeyT>(broaderParameter, (key) =>
        toIri(key, namespace),
      ),
    });
  }

  return {
    Concept,

    ConceptScheme: <
      ConceptsRecordKeyT extends string,
      ConceptsRecordT extends Record<
        ConceptsRecordKeyT,
        Omit<
          ConvertibleConceptParameters<ConceptsRecordKeyT>,
          "broader" | "notation"
        > & {
          readonly $identifier?: NamespaceKeyT | NamedNode;
          readonly broader?: ConvertibleRelatedConcepts<ConceptsRecordKeyT>;
          readonly notation?:
            | boolean
            | ConvertibleConceptParameters<ConceptsRecordKeyT>["notation"];
        }
      >,
    >(
      $identifier: NamedNode | NamespaceKeyT,
      parameters?: Omit<
        Parameters<typeof skos_ConceptScheme.createUnsafe>[0],
        "$identifier" | "concepts" | "termType" | "topConcepts"
      > & {
        readonly concepts?: ConceptsRecordT;
      },
    ): skos_ConceptScheme => {
      const { concepts: conceptsRecord, ...otherParameters } = parameters ?? {};

      type ConceptsRecordValue =
        ConvertibleConceptParameters<ConceptsRecordKeyT> & {
          $identifier?: NamespaceKeyT | NamedNode;
        };

      const conceptSchemeIdentifier = toIri($identifier, namespace);

      const conceptsRecordKeyToIri = (
        conceptsRecordKey: ConceptsRecordKeyT,
      ): NamedNode =>
        dataFactory.namedNode(
          `${conceptSchemeIdentifier.value}_${conceptsRecordKey}`,
        );

      const concepts: skos_Concept[] = [];
      for (const [partialConceptKey, partialConcept] of Object.entries(
        conceptsRecord ?? {},
      ) as [ConceptsRecordKeyT, ConceptsRecordValue][]) {
        concepts.push(
          Concept(
            partialConcept.$identifier
              ? toIri(partialConcept.$identifier, namespace)
              : conceptsRecordKeyToIri(partialConceptKey),
            {
              ...partialConcept,
              broader: convertRelatedConcepts(
                partialConcept.broader,
                conceptsRecordKeyToIri,
              ),
              notation:
                typeof partialConcept.notation === "boolean" &&
                partialConcept.notation
                  ? [dataFactory.literal(partialConceptKey)]
                  : partialConcept.notation,
            },
          ),
        );
      }

      return skos_ConceptScheme.createUnsafe({
        ...otherParameters,
        $identifier: conceptSchemeIdentifier,
        concepts,
        topConcepts: concepts
          .filter((concept) => concept.broader.length === 0)
          .map((concept) => concept.$identifier()),
      });
    },
  };
}
