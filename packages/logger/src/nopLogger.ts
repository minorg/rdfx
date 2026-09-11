import type { Logger } from "./Logger.js";

export const nopLogger: Logger = {
  child: (): Logger => {
    return nopLogger;
  },
  debug: (): void => {},
  error: (): void => {},
  info: (): void => {},
  isLevelEnabled: (): boolean => {
    return false;
  },
  trace: (): void => {},
  warn: (): void => {},
};
