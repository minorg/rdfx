import { jestRdfMatchers, purifyMatchers } from "@rdfx/testing";
import { expect } from "vitest";

expect.extend(jestRdfMatchers);
expect.extend(purifyMatchers);
