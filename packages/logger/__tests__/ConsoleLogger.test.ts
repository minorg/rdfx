import { describe, it } from "vitest";
import { ConsoleLogger } from "../src/ConsoleLogger.js";

describe("ConsoleLogger", () => {
  const sut = new ConsoleLogger("info");

  it("child", ({ expect }) => {
    expect(sut.child({ test: 1 })).toBeDefined();
  });

  it("debug", () => {
    sut.debug({}, "test");
  });

  it("info", () => {
    sut.info({ value: 1 }, "test");
  });

  it("isLevelEnabled", ({ expect }) => {
    expect(sut.isLevelEnabled("debug")).toStrictEqual(false);
    expect(sut.isLevelEnabled("error")).toStrictEqual(true);
    expect(sut.isLevelEnabled("info")).toStrictEqual(true);
    expect(sut.isLevelEnabled("trace")).toStrictEqual(false);
    expect(sut.isLevelEnabled("warn")).toStrictEqual(true);
  });
});
