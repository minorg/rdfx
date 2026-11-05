#!/bin/bash

set -e

cd "$(dirname "$0")"

rapper -i turtle -o turtle -q xlsx-shapes.shaclmate.ttl | sponge xlsx-shapes.shaclmate.ttl
npm exec @shaclmate/cli -- generate ts --feature object.fromrdf $PWD/xlsx-shapes.shaclmate.ttl | sponge $PWD/xlsx-shapes.shaclmate.ts
npm exec biome -- check --write $PWD/xlsx-shapes.shaclmate.ts
