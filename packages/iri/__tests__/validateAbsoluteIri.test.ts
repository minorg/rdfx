import { describe, it } from "vitest";
import { validateAbsoluteIri } from "../src/validateAbsoluteIri.js";
import "@rdfx/testing";

describe("validateAbsoluteIri", () => {
  it("absolute IRI", ({ expect }) => {
    expect(validateAbsoluteIri("http://example.com")).not.toBeLeft();
  });

  it("no scheme", ({ expect }) => {
    expect(validateAbsoluteIri("example")).toBeLeft();
  });

  it("scheme without reference", ({ expect }) => {
    expect(validateAbsoluteIri("example:")).toBeLeft();
  });

  it("scheme with blank reference", ({ expect }) => {
    expect(validateAbsoluteIri("example: ")).toBeLeft();
  });

  it("leading spaces", ({ expect }) => {
    expect(validateAbsoluteIri(" example:reference")).toBeLeft();
  });

  it("trailing spaces", ({ expect }) => {
    expect(validateAbsoluteIri("example:reference ")).toBeLeft();
  });

  it("reference without scheme", ({ expect }) => {
    expect(validateAbsoluteIri(":example")).toBeLeft();
  });

  it("blank", ({ expect }) => {
    expect(validateAbsoluteIri(" ")).toBeLeft();
  });
});
