import type * as RDF from "@rdfjs/types";
import { termToString } from "rdf-string";
import { termArrayToString } from "./jestRdfMatchers.js";

export function toEqualRdfTermSet(received: RDF.Term[], actual: RDF.Term[]) {
  if (received.length !== actual.length) {
    return {
      message: () =>
        `expected ${termArrayToString(received)} to equal ${termArrayToString(actual)}`,
      pass: false,
    };
  }

  for (const receivedElement of received) {
    if (
      !actual.some((actualElement) => actualElement.equals(receivedElement))
    ) {
      return {
        message: () =>
          `expected ${termToString(receivedElement)} to be present in set`,
        pass: false,
      };
    }
  }

  return {
    message: () =>
      `expected ${termArrayToString(received)} not to equal ${termArrayToString(actual)}`,
    pass: true,
  };
}
