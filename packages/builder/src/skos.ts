import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { skos as _namespace } from "@tpluscode/rdf-ns-builders";
import { skos_Concept, skos_ConceptScheme } from "./shapes.js";
import { toIri } from "./toIri.js";

export interface ConvertibleConceptParameters<ConceptIriString extends string>
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
  type NamespaceKey = keyof NamespaceT & string;

  function ConceptBuilder(
    $identifier: NamedNode | NamespaceKey,
    parameters?: ConvertibleConceptParameters<NamespaceKey>,
  ): skos_Concept {
    const { broader: broaderParameter, ...otherParameters } = parameters ?? {};

    return skos_Concept.createUnsafe({
      ...otherParameters,
      $identifier: toIri($identifier, namespace),
      broader: convertRelatedConcepts<NamespaceKey>(broaderParameter, (key) =>
        toIri(key, namespace),
      ),
    });
  }

  type ConceptSchemeConceptsRecordConstraint<T> = {
    [K in keyof T]: Omit<
      ConvertibleConceptParameters<Extract<keyof T, string>>,
      "broader" | "notation"
    > & {
      readonly $identifier?: NamespaceKey | NamedNode;
      readonly broader?: ConvertibleRelatedConcepts<Extract<keyof T, string>>;
      readonly notation?:
        | boolean
        | ConvertibleConceptParameters<Extract<keyof T, string>>["notation"];
    };
  };

  return {
    namespace: _namespace,

    Concept: ConceptBuilder,

    ConceptScheme: <
      ConceptsRecordT extends
        ConceptSchemeConceptsRecordConstraint<ConceptsRecordT>,
    >(
      $identifier: NamedNode | NamespaceKey,
      parameters?: Omit<
        Parameters<typeof skos_ConceptScheme.createUnsafe>[0],
        "$identifier" | "concepts" | "termType" | "topConcepts"
      > & {
        readonly concepts?: ConceptsRecordT;
      },
    ): skos_ConceptScheme => {
      const { concepts: conceptsRecord, ...otherParameters } = parameters ?? {};

      type ConceptsRecordKey = keyof ConceptsRecordT & string;
      type ConceptsRecordValue =
        ConvertibleConceptParameters<ConceptsRecordKey> & {
          $identifier?: NamespaceKey | NamedNode;
        };

      const conceptSchemeIdentifier = toIri($identifier, namespace);

      const conceptsRecordKeyToIri = (
        conceptsRecordKey: ConceptsRecordKey,
      ): NamedNode =>
        dataFactory.namedNode(
          `${conceptSchemeIdentifier.value}_${conceptsRecordKey}`,
        );

      const concepts: skos_Concept[] = [];
      for (const [conceptsRecordKey, conceptsRecordValue] of Object.entries(
        conceptsRecord ?? {},
      ) as [ConceptsRecordKey, ConceptsRecordValue][]) {
        concepts.push(
          ConceptBuilder(
            conceptsRecordValue.$identifier
              ? toIri(conceptsRecordValue.$identifier, namespace)
              : conceptsRecordKeyToIri(conceptsRecordKey),
            {
              ...conceptsRecordValue,
              broader: convertRelatedConcepts(
                conceptsRecordValue.broader,
                conceptsRecordKeyToIri,
              ),
              notation:
                typeof conceptsRecordValue.notation === "boolean" &&
                conceptsRecordValue.notation
                  ? [dataFactory.literal(conceptsRecordKey)]
                  : conceptsRecordValue.notation,
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
