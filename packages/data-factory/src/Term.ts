export abstract class Term {
  abstract readonly termType:
    | "BlankNode"
    | "DefaultGraph"
    | "Literal"
    | "NamedNode"
    | "Quad"
    | "Variable";
  abstract readonly value: string;

  toJSON() {
    return {
      termType: this.termType,
      value: this.value,
    };
  }
}
