import type { GraphStore } from "./GraphStore.js";

/**
 * GraphStore specialization that supports retrieving versions of named graphs.
 *
 * Writes to the store return the new version of the store. Versions are intentionally opaque.
 */
export type VersionedGraphStore<
  VersionT,
  ClearOptionsT extends object = object,
  ClearReturnT extends { readonly version: VersionT } = {
    readonly version: VersionT;
  },
  DeleteOptionsT extends object = object,
  DeleteReturnT extends { readonly version: VersionT } = {
    readonly version: VersionT;
  },
  GetOptionsT extends { readonly version?: VersionT } = {
    readonly version?: VersionT;
  },
  HeadOptionsT extends { readonly version?: VersionT } = {
    readonly version?: VersionT;
  },
  PostOptionsT extends object = object,
  PostReturnT extends { readonly version: VersionT } = {
    readonly version: VersionT;
  },
  PutOptionsT extends object = object,
  PutReturnT extends { readonly version: VersionT } = {
    readonly version: VersionT;
  },
> = GraphStore<
  ClearOptionsT,
  ClearReturnT,
  DeleteOptionsT,
  DeleteReturnT,
  GetOptionsT,
  HeadOptionsT,
  PostOptionsT,
  PostReturnT,
  PutOptionsT,
  PutReturnT
>;
