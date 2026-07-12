import { dirname } from "node:path";
import type { Stream } from "@rdfjs/types";
import { RdfFileGraphStore } from "@rdfx/fs";
import type { GraphIdentifier } from "@rdfx/graph-store";
import type { Either, Maybe } from "purify-ts";
import type { Logger } from "ts-log";
import { Memoize } from "typescript-memoize";

import { AbstractVersionedRdfFileGraphStore } from "./AbstractVersionedRdfFileGraphStore.js";

export class VersionedRdfFileGraphStore extends AbstractVersionedRdfFileGraphStore {
  constructor(
    path: string,
    options?: {
      gitParameters?: AbstractVersionedRdfFileGraphStore.GitParameters;
      logger?: Logger;
    },
  ) {
    super({
      gitParameters: options?.gitParameters ?? {
        dir: dirname(path),
      },
      logger: options?.logger,
      path,
    });
  }

  @Memoize()
  protected get delegate(): RdfFileGraphStore {
    return new RdfFileGraphStore(this.path, {
      fileSystem: this.fileSystem,
      logger: this.logger,
    });
  }

  override get(
    identifier: GraphIdentifier,
    options?: { readonly version?: string } | undefined,
  ): Promise<Either<Error, Maybe<Stream>>> {
    if (!options?.version) {
      return this.delegate.get(identifier);
    }
  }

  override head(
    identifier: GraphIdentifier,
    options?: { readonly version?: string } | undefined,
  ): Promise<Either<Error, boolean>> {
    if (!options?.version) {
      return this.delegate.head(identifier);
    }
    throw new Error("Method not implemented.");
  }
}
