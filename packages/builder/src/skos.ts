import type { NamespaceBuilder } from "@rdfjs/namespace";
import type { NamedNode } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { skos as _namespace } from "@tpluscode/rdf-ns-builders";
import { sentenceCase } from "change-case";
import type { BuilderBuilderParameters } from "./BuilderBuilderParameters.js";
import { skos_Concept, skos_ConceptScheme } from "./shapes.js";

export interface ConvertibleConceptParameters<
  ConceptIriString extends string,
  DefaultNamespaceT extends NamespaceBuilder,
> extends Omit<
    Parameters<typeof skos_Concept.createUnsafe<DefaultNamespaceT>>[0],
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

export function skos<DefaultNamespaceT extends NamespaceBuilder>({
  defaultNamespace,
  toIri,
}: BuilderBuilderParameters<DefaultNamespaceT>) {
  type DefaultNamespaceKey = keyof DefaultNamespaceT & string;

  function Concept(
    $identifier: NamedNode | DefaultNamespaceKey,
    parameters?: ConvertibleConceptParameters<
      DefaultNamespaceKey,
      DefaultNamespaceT
    >,
  ): skos_Concept {
    let {
      broader: broaderParameter,
      prefLabel,
      ...otherParameters
    } = parameters ?? {};

    if (!prefLabel && typeof $identifier === "string") {
      prefLabel = sentenceCase($identifier);
    }

    return skos_Concept.createUnsafe<DefaultNamespaceT>({
      ...otherParameters,
      $defaultNamespace: defaultNamespace,
      $identifier,
      broader: convertRelatedConcepts<DefaultNamespaceKey>(
        broaderParameter,
        (key) => toIri(key),
      ),
      prefLabel,
    });
  }

  type ConceptSchemeConceptsRecordConstraint<T> = {
    [K in keyof T]: Omit<
      ConvertibleConceptParameters<Extract<keyof T, string>, DefaultNamespaceT>,
      "broader" | "notation"
    > & {
      readonly $identifier?: DefaultNamespaceKey | NamedNode;
      readonly broader?: ConvertibleRelatedConcepts<Extract<keyof T, string>>;
      readonly notation?:
        | boolean
        | ConvertibleConceptParameters<
            Extract<keyof T, string>,
            DefaultNamespaceT
          >["notation"];
    };
  };

  return {
    namespace: _namespace as NamespaceBuilder<keyof typeof _namespace>,

    Concept: Concept,

    ConceptScheme: <
      ConceptsRecordT extends
        ConceptSchemeConceptsRecordConstraint<ConceptsRecordT>,
    >(
      $identifier: NamedNode | DefaultNamespaceKey,
      parameters?: Omit<
        Parameters<
          typeof skos_ConceptScheme.createUnsafe<DefaultNamespaceT>
        >[0],
        "$identifier" | "concepts" | "termType" | "topConcepts"
      > & {
        readonly concepts?: ConceptsRecordT;
      },
    ): skos_ConceptScheme => {
      let {
        concepts: conceptsRecord,
        prefLabel,
        ...otherParameters
      } = parameters ?? {};

      type ConceptsRecordKey = keyof ConceptsRecordT & string;
      type ConceptsRecordValue = ConvertibleConceptParameters<
        ConceptsRecordKey,
        DefaultNamespaceT
      > & {
        $identifier?: NamedNode | DefaultNamespaceKey;
      };

      const conceptSchemeIdentifier = toIri($identifier);

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
          Concept(
            conceptsRecordValue.$identifier
              ? toIri(conceptsRecordValue.$identifier)
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
              prefLabel:
                conceptsRecordValue.prefLabel ??
                sentenceCase(conceptsRecordKey),
            },
          ),
        );
      }

      if (!prefLabel && typeof $identifier === "string") {
        prefLabel = sentenceCase($identifier);
      }

      return skos_ConceptScheme.createUnsafe<DefaultNamespaceT>({
        ...otherParameters,
        $defaultNamespace: defaultNamespace,
        $identifier: conceptSchemeIdentifier,
        concepts,
        prefLabel,
        topConcepts: concepts
          .filter((concept) => concept.broader.length === 0)
          .map((concept) => concept.$identifier()),
      });
    },
  };
}
