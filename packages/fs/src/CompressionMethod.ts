import type { compressionMethods } from "./compressionMethods.js";

export type CompressionMethod = (typeof compressionMethods)[number];
