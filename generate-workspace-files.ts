#!/usr/bin/env npm exec tsx --

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import type { CompilerOptions } from "typescript";

const VERSION = "0.0.34";

const shaclmateVersion = "4.0.65";
const vitestVersion = "~4.1.5";

const externalDependencies = {
  "@biomejs/biome": "2.3.10",
  "@rdfjs/dataset": "~2.0.2",
  "@rdfjs/namespace": "~2.0.1",
  "@rdfjs/parser-jsonld": "~2.1.3",
  "@rdfjs/parser-n3": "~2.1.0",
  "@rdfjs/prefix-map": "~0.1.2",
  "@rdfjs/serializer-jsonld-ext": "~4.0.2",
  "@rdfjs/serializer-ntriples": "~2.0.1",
  "@rdfjs/serializer-rdfjs": "0.1.3",
  "@rdfjs/serializer-turtle": "~1.1.5",
  "@rdfjs/sink-map": "~2.0.1",
  "@rdfjs/term-set": "~2.0.3",
  "@rdfjs/to-ntriples": "~3.0.1",
  "@rdfjs/types": "~2.0.1",
  "@shaclmate/compiler": shaclmateVersion,
  "@shaclmate/validator": shaclmateVersion,
  "@tpluscode/rdf-ns-builders": "~4.3.0",
  "@tsconfig/node24": "^24",
  "@tsconfig/strictest": "~2.0.8",
  "@types/n3": "~1.26.0",
  "@types/node": "^24",
  "@types/rdfjs__dataset": "~2.0.7",
  "@types/rdfjs__namespace": "~2.0.10",
  "@types/rdfjs__parser-jsonld": "~2.1.7",
  "@types/rdfjs__parser-n3": "~2.0.6",
  "@types/rdfjs__prefix-map": "~0.1.5",
  "@types/rdfjs__serializer-jsonld-ext": "~4.0.1",
  "@types/rdfjs__serializer-ntriples": "~2.0.6",
  "@types/rdfjs__serializer-rdfjs": "0.1.6",
  "@types/rdfjs__serializer-turtle": "~1.1.0",
  "@types/rdfjs__sink-map": "~2.0.5",
  "@types/rdfjs__term-set": "~2.0.9",
  "@types/rdfjs__to-ntriples": "~3.0.0",
  "@types/readable-stream": "~4.0.23",
  "@types/unbzip2-stream": "~1.4.3",
  "@vitest/coverage-v8": vitestVersion,
  "change-case": "~5.4.4",
  "decimal.js": "~10.6.0",
  depcheck: "~1.4.7",
  "get-stream": "~9.0.1",
  housemd: "0.1.3",
  "into-stream": "~9.1.0",
  "isomorphic-git": "~1.38.3",
  mime: "~4.1.0",
  n3: "~1.26.0",
  oxigraph: "0.5.8",
  "purify-ts": "~2.1.4",
  "rdf-isomorphic": "~2.0.1", // For @rdfx/testing code adapted from jest-rdf
  "rdf-string": "~2.0.1", // For @rdfx/testing code adapted from jest-rdf
  "rdf-terms": "~2.0.0", // For @rdfx/testing code adapted from jest-rdf
  "readable-stream": "^4.7.0",
  rimraf: "~6.0.1",
  "ts-invariant": "~0.10.3",
  "ts-log": "~3.0.2",
  tsx: "~4.16.2",
  turbo: "~2.5.5",
  typescript: "6.0.3",
  "typescript-memoize": "~1.1.1",
  "unbzip2-stream": "~1.4.3",
  vitest: vitestVersion,
  "vitest-fetch-mock": "~0.4.5",
};

type PackageName =
  | "builder"
  | "data-factory"
  | "fs"
  | "git"
  | "graph-store"
  | "literal"
  | "parsers"
  | "resource"
  | "serializers"
  | "sparql-client"
  | "string"
  | "testing";

interface Tsconfig {
  compilerOptions?: CompilerOptions;
  // exclude?: string[];
  extends?: string | string[];
  // files?: string[];
  include?: string[];
  // references?: { path: string; prepend?: boolean }[];
}

interface Workspace {
  bin?: Record<string, string>;
  dependencies?: {
    external?: readonly (keyof typeof externalDependencies)[];
    internal?: readonly PackageName[];
  };
  description?: string;
  devDependencies?: {
    external?: readonly (keyof typeof externalDependencies)[];
    internal?: readonly PackageName[];
  };
  keywords?: readonly string[];
  homepage?: string;
  scripts?: Record<string, string>;
  tsconfig: Tsconfig;
}

const packageTsconfig: Tsconfig = {
  compilerOptions: {
    declaration: true,
    declarationMap: true,
    exactOptionalPropertyTypes: false,
    experimentalDecorators: true,
    forceConsistentCasingInFileNames: true,
    lib: ["ES2023"],
    module: "NodeNext" as any,
    noUncheckedIndexedAccess: false,
    outDir: "dist",
    rootDir: "src",
    sourceMap: true,
    target: "ES2023" as any,
  } satisfies CompilerOptions,
  extends: ["@tsconfig/strictest/tsconfig.json"],
  include: ["src/**/*.ts"],
};

const workspaces = {
  packages: {
    builder: {
      dependencies: {
        external: [
          "@rdfjs/namespace",
          "@rdfjs/types",
          "@types/rdfjs__namespace",
          "change-case",
          "purify-ts",
          "ts-invariant",
        ],
        internal: ["data-factory", "resource"],
      },
      devDependencies: {
        external: [
          "@rdfjs/dataset",
          "@shaclmate/compiler",
          "@shaclmate/validator",
          "@tpluscode/rdf-ns-builders",
          "@types/rdfjs__dataset",
          "ts-log",
        ],
        internal: ["fs", "resource"],
      },
      tsconfig: packageTsconfig,
    },
    "data-factory": {
      dependencies: {
        external: ["@rdfjs/types"],
        internal: ["string"],
      },
      devDependencies: {
        internal: ["testing"],
      },
      tsconfig: packageTsconfig,
    },
    fs: {
      dependencies: {
        external: [
          "@rdfjs/dataset",
          "@rdfjs/prefix-map",
          "@rdfjs/types",
          "@types/rdfjs__dataset",
          "@types/rdfjs__prefix-map",
          "@types/unbzip2-stream",
          "into-stream",
          "mime",
          "purify-ts",
          "ts-log",
          "typescript-memoize",
          "unbzip2-stream",
        ],
        internal: [
          "data-factory",
          "graph-store",
          "parsers",
          "serializers",
          "string",
        ],
      },
      tsconfig: {
        ...packageTsconfig,
        compilerOptions: {
          ...packageTsconfig.compilerOptions,
          types: ["node"],
        },
      },
    },
    git: {
      dependencies: {
        external: ["isomorphic-git", "ts-log", "typescript-memoize"],
        internal: ["fs", "graph-store"],
      },
      tsconfig: packageTsconfig,
    },
    "graph-store": {
      dependencies: {
        external: [
          "@rdfjs/types",
          "@types/readable-stream",
          "purify-ts",
          "readable-stream",
          "ts-log",
        ],
      },
      devDependencies: {
        external: ["@rdfjs/dataset", "get-stream", "into-stream"],
        internal: ["data-factory"],
      },
      tsconfig: packageTsconfig,
    },
    literal: {
      dependencies: {
        external: ["@rdfjs/types", "decimal.js", "purify-ts"],
      },
      devDependencies: {
        external: ["@tpluscode/rdf-ns-builders"],
        internal: ["data-factory"],
      },
      tsconfig: packageTsconfig,
    },
    parsers: {
      dependencies: {
        external: [
          "@rdfjs/parser-jsonld",
          "@rdfjs/parser-n3",
          "@rdfjs/sink-map",
          "@rdfjs/types",
          "@types/rdfjs__parser-jsonld",
          "@types/rdfjs__parser-n3",
        ],
      },
      tsconfig: packageTsconfig,
    },
    resource: {
      dependencies: {
        external: [
          "@rdfjs/term-set",
          "@rdfjs/types",
          "@types/rdfjs__term-set",
          "decimal.js",
          "purify-ts",
        ],
        internal: ["literal", "string"],
      },
      devDependencies: {
        external: [
          "@rdfjs/dataset",
          "@tpluscode/rdf-ns-builders",
          "@types/rdfjs__dataset",
          "@types/rdfjs__to-ntriples",
          "housemd",
          "ts-invariant",
        ],
        internal: ["data-factory"],
      },
      tsconfig: packageTsconfig,
    },
    serializers: {
      dependencies: {
        external: [
          "@rdfjs/prefix-map",
          "@rdfjs/serializer-jsonld-ext",
          "@rdfjs/serializer-ntriples",
          "@rdfjs/serializer-rdfjs",
          "@rdfjs/serializer-turtle",
          "@rdfjs/sink-map",
          "@rdfjs/types",
          "@types/n3",
          "@types/readable-stream",
          "@types/rdfjs__prefix-map",
          "@types/rdfjs__serializer-jsonld-ext",
          "@types/rdfjs__serializer-ntriples",
          "@types/rdfjs__serializer-rdfjs",
          "@types/rdfjs__serializer-turtle",
          "@types/rdfjs__sink-map",
          "n3",
          "readable-stream",
        ],
      },
      tsconfig: packageTsconfig,
    },
    "sparql-client": {
      dependencies: {
        external: ["@rdfjs/types", "@types/n3", "n3"],
      },
      devDependencies: {
        external: ["oxigraph"],
      },
      tsconfig: packageTsconfig,
    },
    string: {
      dependencies: {
        external: ["@rdfjs/to-ntriples", "@rdfjs/types", "purify-ts"],
      },
      devDependencies: {
        external: ["@types/rdfjs__to-ntriples"],
        // internal: ["data-factory"], // Don't declare a circular dependency
      },
      tsconfig: packageTsconfig,
    },
    testing: {
      dependencies: {
        external: [
          "@rdfjs/types",
          "purify-ts",
          "rdf-isomorphic",
          "rdf-string",
          "rdf-terms",
          "vitest",
        ],
      },
      tsconfig: packageTsconfig,
    },
  } satisfies Record<PackageName, Workspace>,
} as const;

// @ts-expect-error: this script will never be built into CommonJS, can ignore this error
const myDirPath = path.dirname(url.fileURLToPath(import.meta.url));

for (const [workspacesDirectoryAny, workspaces_] of Object.entries(
  workspaces,
)) {
  const workspacesDirectoryName = workspacesDirectoryAny as "packages";
  for (const [workspaceName, workspaceAny] of Object.entries(workspaces_)) {
    const workspace = workspaceAny as Workspace;

    const packageDirectoryPath = path.join(
      myDirPath,
      workspacesDirectoryName,
      workspaceName,
    );

    fs.mkdirSync(packageDirectoryPath, { recursive: true });

    const files = new Set<string>();
    files.add("LICENSE");
    if (fs.existsSync(path.join(packageDirectoryPath, "README.md"))) {
      files.add("README.md");
    }
    const srcDirectoryPath = path.join(packageDirectoryPath, "src");
    if (fs.existsSync(srcDirectoryPath)) {
      for (const dirent of fs.readdirSync(srcDirectoryPath, {
        withFileTypes: true,
        recursive: true,
      })) {
        if (!dirent.name.endsWith(".ts") || !dirent.isFile()) {
          continue;
        }
        for (const fileNameGlob of ["*.js", "*.d.ts"]) {
          files.add(
            path.join(
              "dist",
              path.relative(srcDirectoryPath, dirent.parentPath),
              fileNameGlob,
            ),
          );
        }
      }
    }

    let testsDirectoryPath: string | null = path.join(
      packageDirectoryPath,
      "__tests__",
    );
    if (!fs.existsSync(testsDirectoryPath)) {
      testsDirectoryPath = null;
    }

    const packageName = `@rdfx/${workspaceName}`;

    fs.writeFileSync(
      path.join(packageDirectoryPath, "package.json"),
      `${JSON.stringify(
        {
          bin: workspace.bin,
          dependencies: {
            ...(workspace.dependencies?.internal ?? []).toSorted().reduce(
              (map, packageName) => {
                map[`@rdfx/${packageName}`] = VERSION;
                return map;
              },
              {} as Record<string, string>,
            ),
            ...(workspace.dependencies?.external ?? []).toSorted().reduce(
              (map, packageName) => {
                map[packageName] = externalDependencies[packageName];
                return map;
              },
              {} as Record<string, string>,
            ),
          },
          description: workspace.description,
          devDependencies: {
            ...(workspace.devDependencies?.internal ?? []).toSorted().reduce(
              (map, packageName) => {
                map[`@rdfx/${packageName}`] = VERSION;
                return map;
              },
              {} as Record<string, string>,
            ),
            ...(workspace.devDependencies?.external ?? []).toSorted().reduce(
              (map, packageName) => {
                map[packageName] = externalDependencies[packageName];
                return map;
              },
              {} as Record<string, string>,
            ),
          },
          files: files.size > 0 ? [...files].sort() : undefined,
          homepage: workspace.homepage,
          keywords: workspace.keywords,
          license: "Apache-2.0",
          main: files.size > 0 ? "./dist/index.js" : undefined,
          name: packageName,
          packageManager: "npm@11.11.0",
          private: workspacesDirectoryName !== "packages" ? true : undefined,
          repository: {
            type: "git",
            url: "git+https://github.com/minorg/rdfx.git",
          },
          scripts: {
            build: `tsc -b${
              workspace.bin
                ? ` && ${Object.values(workspace.bin)
                    .map((bin) => `chmod +x ${bin}`)
                    .join(" && ")}`
                : ""
            }`,
            clean: "rimraf dist",
            depcheck: "depcheck .",
            dev: "tsc -w --preserveWatchOutput",
            ...(testsDirectoryPath !== null
              ? {
                  "dev:tests": "tsc -p __tests__ -w --preserveWatchOutput",
                }
              : {}),
            test: fs.existsSync(path.join(packageDirectoryPath, "__tests__"))
              ? `cd ../.. && vitest run ${packageDirectoryPath}/__tests__`
              : undefined,
            ...workspace.scripts,
          },
          type: "module",
          types: files.size > 0 ? "./dist/index.d.ts" : undefined,
          version: VERSION,
        },
        undefined,
        2,
      )}\n`,
    );

    for (const fileName of ["LICENSE"]) {
      const packageFilePath = path.resolve(packageDirectoryPath, fileName);
      if (fs.existsSync(packageFilePath)) {
        continue;
      }
      fs.symlinkSync(`../../${fileName}`, packageFilePath);
    }

    fs.writeFileSync(
      path.resolve(packageDirectoryPath, "tsconfig.json"),
      `${JSON.stringify(workspace.tsconfig, undefined, 2)}\n`,
    );

    if (testsDirectoryPath !== null) {
      fs.writeFileSync(
        path.join(testsDirectoryPath, "tsconfig.json"),
        `${JSON.stringify(
          {
            compilerOptions: {
              exactOptionalPropertyTypes: false,
              experimentalDecorators: true,
              forceConsistentCasingInFileNames: true,
              noEmit: true,
              noUncheckedIndexedAccess: false,
            },
            extends: [
              "@tsconfig/node24/tsconfig.json",
              "@tsconfig/strictest/tsconfig.json",
            ],
            include: ["./**/*.ts", "../src/**/*"],
          },
          undefined,
          2,
        )}\n`,
      );
    }
  }
}

// Root package.json
fs.writeFileSync(
  path.join(myDirPath, "package.json"),
  `${JSON.stringify(
    {
      devDependencies: (
        [
          "@biomejs/biome",
          "@tsconfig/node24",
          "@tsconfig/strictest",
          "@types/node",
          "@vitest/coverage-v8",
          "depcheck",
          "rimraf",
          "tsx",
          "turbo",
          "typescript",
          "vitest",
          "vitest-fetch-mock",
        ] satisfies readonly (keyof typeof externalDependencies)[]
      )
        .toSorted()
        .reduce(
          (map, packageName) => {
            map[packageName] = externalDependencies[packageName];
            return map;
          },
          {} as Record<string, string>,
        ),
      name: "rdfx",
      optionalDependencies: {
        "@biomejs/cli-linux-x64": externalDependencies["@biomejs/biome"],
      },
      packageManager: "npm@11.11.0",
      private: true,
      scripts: {
        build: "turbo run build",
        check: "biome check",
        "check:write": "biome check --write",
        "check:write:unsafe": "biome check --write --unsafe",
        clean: "turbo run clean",
        depcheck: "turbo run depcheck",
        dev: "turbo run --concurrency 22 dev dev:tests",
        test: "vitest run",
        "test:coverage": "vitest run --coverage",
      },
      workspaces: Object.entries(workspaces).flatMap(
        ([workspacesDirectoryName, workspaces_]) =>
          Object.keys(workspaces_).map(
            (workspaceName) => `${workspacesDirectoryName}/${workspaceName}`,
          ),
      ),
    },
    undefined,
    2,
  )}\n`,
);
