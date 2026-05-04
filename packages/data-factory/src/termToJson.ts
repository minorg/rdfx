import type * as RDF from "@rdfjs/types";

export function termToJson(term: RDF.Term): Record<string, unknown> {
  switch (term.termType) {
    case "DefaultGraph":
      return { termType: term.termType };

    case "Literal":
      return {
        termType: term.termType,
        datatype: term.datatype.value,
        direction: term.direction,
        language: term.language,
        value: term.value,
      };

    case "NamedNode":
    case "BlankNode":
    case "Variable":
      return {
        termType: term.termType,
        value: term.value,
      };

    case "Quad":
      return {
        termType: term.termType,
        subject: termToJson(term.subject),
        predicate: termToJson(term.predicate),
        object: termToJson(term.object),
        graph: termToJson(term.graph),
      };
  }
}
