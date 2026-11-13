#!/bin/bash

set -e

cd "$(dirname "$0")"

rapper -i turtle -o turtle -q xlsx-test-shapes.shaclmate.ttl | sponge xlsx-test-shapes.shaclmate.ttl
npm exec @shaclmate/cli -- generate ts --feature object.fromjson --feature object.json.parse --feature object.tordf --feature rdfjsdatasetobjectset $PWD/xlsx-test-shapes.shaclmate.ttl | sponge $PWD/xlsx-test-shapes.shaclmate.ts
npm exec biome -- check --write $PWD/xlsx-test-shapes.shaclmate.ts
