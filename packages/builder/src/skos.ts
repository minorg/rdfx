import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { skos_Concept, skos_ConceptScheme } from "./shapes.js";
import { toIri } from "./toIri.js";

interface ConceptBuilderParameters<ConceptIriString extends string>
  extends Omit<
    Parameters<typeof skos_Concept.createUnsafe>[0],
    "$identifier" | "broader" | "termType"
  > {
  readonly broader?: readonly (skos_Concept | ConceptIriString | NamedNode)[];
}

export function skos<NamespaceT extends NamespaceBuilder>({
  namespace,
}: {
  namespace: NamespaceT;
}) {
  function ConceptBuilder(
    $identifier: NamedNode | keyof NamespaceT,
    parameters: ConceptBuilderParameters<keyof NamespaceT & string>,
  ): skos_Concept {
    const { broader, ...otherParameters } = parameters;

    return skos_Concept.createUnsafe({
      ...otherParameters,
      $identifier: toIri($identifier, namespace),
      broader: broader
        ? broader.map((broader) =>
            typeof broader === "string" ? namespace(broader) : broader,
          )
        : undefined,
    });
  }

  return {
    Concept: ConceptBuilder,

    ConceptScheme: <
      ConceptsRecordKeyT extends string,
      ConceptsRecordT extends Record<
        ConceptsRecordKeyT,
        Omit<ConceptBuilderParameters<ConceptsRecordKeyT>, "notation"> & {
          $identifier?: keyof NamespaceT | NamedNode;
          notation:
            | boolean
            | ConceptBuilderParameters<ConceptsRecordKeyT>["notation"];
        }
      >,
    >(
      $identifier: NamedNode | keyof NamespaceT,
      parameters: Omit<
        Parameters<typeof skos_ConceptScheme.createUnsafe>[0],
        "$identifier" | "concepts" | "termType" | "topConcepts"
      > & {
        readonly concepts: ConceptsRecordT;
      },
    ): skos_ConceptScheme => {
      const { concepts: conceptsRecord, ...otherParameters } = parameters;

      type ConceptsRecordValue =
        ConceptBuilderParameters<ConceptsRecordKeyT> & {
          $identifier?: keyof NamespaceT | NamedNode;
        };

      const conceptSchemeIdentifier = toIri($identifier, namespace);

      const concepts: skos_Concept[] = [];
      for (const [partialConceptKey, partialConcept] of Object.entries(
        parameters.concepts,
      ) as [ConceptsRecordKeyT, ConceptsRecordValue][]) {
        concepts.push(
          ConceptBuilder(
            partialConcept.$identifier
              ? toIri(partialConcept.$identifier, namespace)
              : dataFactory.namedNode(
                  `${conceptSchemeIdentifier}_${partialConceptKey}`,
                ),
            {
              ...partialConcept,
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
