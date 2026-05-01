import { describe, it } from "vitest";
import { RdfFile } from "../src/RdfFile.js";

describe("RdfFile", () => {
  describe("fromPath", () => {
    for (const rdfFileName of ["test.jsonld", "test.nt", "test.nt.br"]) {
      it(`should recognize ${rdfFileName} has an RDF file extension`, ({
        expect,
      }) => {
        expect(
          RdfFile.fromPath(rdfFileName).toMaybe().extractNullable(),
        ).not.toBeNull();
      });
    }

    for (const rdfFileName of ["test.json", "test.nt.whatever", "test.doc"]) {
      it(`should recognize ${rdfFileName} does not have RDF file extension`, ({
        expect,
      }) => {
        expect(
          RdfFile.fromPath(rdfFileName).toMaybe().extractNullable(),
        ).toBeNull();
      });
    }
  });
});
