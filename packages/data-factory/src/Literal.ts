import type * as RDF from "@rdfjs/types";

import { NamedNode } from "./NamedNode.js";
import { Term } from "./Term.js";

/**
 * A term that represents an RDF literal,
 * containing a string with an optional language tag and optional direction
 * or datatype.
 */
export class Literal extends Term implements RDF.Literal {
  private static readonly RDF_DIRECTIONAL_LANGUAGE_STRING: RDF.NamedNode =
    new NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#dirLangString");
  private static readonly RDF_LANGUAGE_STRING: RDF.NamedNode = new NamedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  );
  private static readonly XSD_STRING: RDF.NamedNode = new NamedNode(
    "http://www.w3.org/2001/XMLSchema#string",
  );

  public readonly datatype: RDF.NamedNode;
  public readonly direction: "ltr" | "rtl" | "";
  public readonly language: string;
  public readonly termType = "Literal";

  public constructor(
    readonly value: string,
    languageOrDatatype?: string | RDF.NamedNode | RDF.DirectionalLanguage,
  ) {
    super();
    if (typeof languageOrDatatype === "string") {
      this.language = languageOrDatatype;
      this.datatype = Literal.RDF_LANGUAGE_STRING;
      this.direction = "";
    } else if (languageOrDatatype) {
      if ("termType" in languageOrDatatype) {
        this.language = "";
        this.datatype = languageOrDatatype;
        this.direction = "";
      } else {
        this.language = languageOrDatatype.language;
        this.datatype = languageOrDatatype.direction
          ? Literal.RDF_DIRECTIONAL_LANGUAGE_STRING
          : Literal.RDF_LANGUAGE_STRING;
        this.direction = languageOrDatatype.direction ?? "";
      }
    } else {
      this.language = "";
      this.datatype = Literal.XSD_STRING;
      this.direction = "";
    }
  }

  public equals(other?: RDF.Term | null): boolean {
    return (
      !!other &&
      other.termType === "Literal" &&
      other.value === this.value &&
      other.language === this.language &&
      (other.direction === this.direction ||
        (!other.direction && this.direction === "")) &&
      this.datatype.equals(other.datatype)
    );
  }
}
