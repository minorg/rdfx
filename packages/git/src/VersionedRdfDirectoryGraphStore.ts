import { RdfDirectoryGraphStore } from "@rdfx/fs";
import type { Logger } from "ts-log";
import { Memoize } from "typescript-memoize";
import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfDirectoryGraphStore extends AbstractVersionedRdfFileGraphStore {
  constructor(
    path: string,
    options?: {
      gitParameters?: AbstractVersionedRdfFileGraphStore.GitParameters;
      logger?: Logger;
    },
  ) {
    super({
      gitParameters: options?.gitParameters ?? {
        dir: path,
      },
      logger: options?.logger,
      path,
    });
  }

  @Memoize()
  protected get delegate(): RdfDirectoryGraphStore {
    return new RdfDirectoryGraphStore(this.path, {
      fileSystem: this.fileSystem,
      logger: this.logger,
    });
  }
}
