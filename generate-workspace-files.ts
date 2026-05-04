#!/usr/bin/env npm exec tsx --

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import type { CompilerOptions } from "typescript";

const VERSION = "0.0.7";

const vitestVersion = "~4.1.5";

const externalDependencies = {
  "@biomejs/biome": "2.3.10",
  "@rdfjs/data-model": "~2.1.1",
  "@rdfjs/dataset": "~2.0.2",
  "@rdfjs/formats": "~4.0.1",
  "@rdfjs/term-set": "~2.0.3",
  "@rdfjs/types": "~2.0.1",
  "@tpluscode/rdf-ns-builders": "~4.3.0",
  "@tsconfig/node24": "^24",
  "@tsconfig/strictest": "~2.0.8",
  "@types/n3": "~1.26.0",
  "@types/node": "^24",
  "@types/rdfjs__data-model": "~2.0.9",
  "@types/rdfjs__dataset": "~2.0.7",
  "@types/rdfjs__formats": "~4.0.1",
  "@types/rdfjs__term-set": "~2.0.9",
  // "@types/readable-stream": "~4.0.23",
  "@types/unbzip2-stream": "~1.4.3",
  "@vitest/coverage-v8": vitestVersion,
  depcheck: "~1.4.7",
  "jest-rdf": "~2.0.0",
  housemd: "0.1.3",
  mime: "~4.1.0",
  n3: "~1.26.0",
  oxigraph: "0.4.7",
  "purify-ts": "~2.1.4",
  // "readable-stream": "^4.7.0",
  rimraf: "~6.0.1",
  "ts-invariant": "~0.10.3",
  "ts-log": "~3.0.2",
  tsx: "~4.16.2",
  turbo: "~2.5.5",
  typescript: "5.9.3",
  "unbzip2-stream": "~1.4.3",
  vitest: vitestVersion,
  "vitest-fetch-mock": "~0.4.5",
};

type PackageName =
  | "data-factory"
  | "fs"
  | "literal"
  | "resource"
  | "sparql-client"
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
    esModuleInterop: true,
    exactOptionalPropertyTypes: false,
    experimentalDecorators: true,
    forceConsistentCasingInFileNames: true,
    lib: ["ES2020"],
    module: "ES2020" as any,
    moduleResolution: "node" as any,
    noUncheckedIndexedAccess: false,
    outDir: "dist",
    rootDir: "src",
    sourceMap: true,
    target: "ES2020" as any,
  } satisfies CompilerOptions,
  extends: ["@tsconfig/strictest/tsconfig.json"],
  include: ["src/**/*.ts"],
};

const workspaces = {
  packages: {
    "data-factory": {
      dependencies: {
        external: ["@rdfjs/types"],
      },
      devDependencies: {
        internal: ["testing"],
      },
      tsconfig: packageTsconfig,
    },
    fs: {
      dependencies: {
        external: [
          "@rdfjs/formats",
          "@rdfjs/types",
          "@types/rdfjs__formats",
          "@types/unbzip2-stream",
          "mime",
          "purify-ts",
          "ts-log",
          "unbzip2-stream",
        ],
      },
      devDependencies: {
        external: ["@rdfjs/dataset", "@types/rdfjs__dataset"],
      },
      tsconfig: {
        ...packageTsconfig,
        compilerOptions: {
          ...packageTsconfig.compilerOptions,
          module: "Node16" as any,
          moduleResolution: "node16" as any,
          types: ["node"],
        },
      },
    },
    literal: {
      dependencies: {
        external: ["@rdfjs/types", "purify-ts"],
      },
      devDependencies: {
        external: [
          "@rdfjs/data-model",
          "@tpluscode/rdf-ns-builders",
          "@types/rdfjs__data-model",
        ],
      },
      tsconfig: packageTsconfig,
    },
    resource: {
      dependencies: {
        external: [
          "@rdfjs/data-model",
          "@rdfjs/term-set",
          "@rdfjs/types",
          "@types/rdfjs__data-model",
          "@types/rdfjs__term-set",
          "purify-ts",
        ],
        internal: ["literal"],
      },
      devDependencies: {
        external: [
          "@rdfjs/dataset",
          "@tpluscode/rdf-ns-builders",
          "@types/rdfjs__dataset",
          "housemd",
          "ts-invariant",
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
    testing: {
      dependencies: {
        external: ["@rdfjs/types", "jest-rdf", "purify-ts", "vitest"],
      },
      tsconfig: packageTsconfig,
    },
  } satisfies Record<PackageName, Workspace>,
} as const;

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
      JSON.stringify(workspace.tsconfig, undefined, 2),
    );

    if (testsDirectoryPath !== null) {
      fs.writeFileSync(
        path.join(testsDirectoryPath, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              exactOptionalPropertyTypes: false,
              experimentalDecorators: true,
              forceConsistentCasingInFileNames: true,
              lib: ["ES2020"],
              module: "ES2020",
              moduleResolution: "node",
              noEmit: true,
              noUncheckedIndexedAccess: false,
              target: "ES2020",
            },
            extends: ["@tsconfig/strictest/tsconfig.json"],
            include: ["./**/*.ts", "../src/**/*"],
          },
          undefined,
          2,
        ),
      );
    }
  }
}

// Root package.json
fs.writeFileSync(
  path.join(myDirPath, "package.json"),
  JSON.stringify(
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
        dev: "turbo run dev dev:tests",
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
  ),
);
