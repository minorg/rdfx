// biome-ignore lint/style/useNodejsImportProtocol: Widely support outside of Node
import type { EventEmitter } from "events";
import { Either, Left } from "purify-ts";

/**
 * Convert an EventEmitter returned by an RDF/JS Stream serializer .import to a string by collecting the output.
 */
export function streamToString(
  stream: EventEmitter,
): Promise<Either<Error, string>> {
  return new Promise((resolve) => {
    let result = "";
    let settled = false;

    stream.on("data", (chunk) => {
      result += String(chunk);
    });
    stream.on("end", () => {
      if (!settled) {
        settled = true;
        resolve(Either.of(result));
      }
    });
    stream.on("error", (error) => {
      if (!settled) {
        settled = true;
        resolve(Left(error));
      }
    });
  });
}
