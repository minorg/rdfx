import { Writable } from "node:stream";
import { pino } from "pino";
import { beforeEach, describe, it } from "vitest";
import type { Logger } from "../src/Logger.js";

describe("pinoLogger", () => {
  let pinoLogger: Logger;
  let logs: object[];

  beforeEach(() => {
    logs = [];
    pinoLogger = pino(
      {
        level: "info",
      },
      new Writable({
        write(chunk, _encoding, callback) {
          logs.push(JSON.parse(chunk.toString()));
          callback();
        },
      }),
    );
  });

  it("child", ({ expect }) => {
    expect(pinoLogger.child({ test: 1 })).toBeDefined();
  });

  it("debug", ({ expect }) => {
    pinoLogger.debug("test");
    expect(logs).toHaveLength(0);
  });

  it("info", ({ expect }) => {
    pinoLogger.info("test", { context: "whatever" });
    expect(logs).toHaveLength(1);
  });

  it("isLevelEnabled", ({ expect }) => {
    expect(pinoLogger.isLevelEnabled("debug")).toStrictEqual(false);
    expect(pinoLogger.isLevelEnabled("error")).toStrictEqual(true);
    expect(pinoLogger.isLevelEnabled("info")).toStrictEqual(true);
    expect(pinoLogger.isLevelEnabled("trace")).toStrictEqual(false);
    expect(pinoLogger.isLevelEnabled("warn")).toStrictEqual(true);
  });

  it("trace", ({ expect }) => {
    pinoLogger.trace("test");
    expect(logs).toHaveLength(0);
  });
});
