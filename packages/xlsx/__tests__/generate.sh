#!/bin/bash

set -e

cd "$(dirname "$0")"

rapper -i turtle -o turtle -q node-shapes.shaclmate.ttl | sponge node-shapes.shaclmate.ttl
npm exec @shaclmate/cli -- generate ts --feature object.fromrdf $PWD/node-shapes.shaclmate.ttl | sponge $PWD/node-shapes.shaclmate.ts
npm exec biome -- check --write $PWD/node-shapes.shaclmate.ts
