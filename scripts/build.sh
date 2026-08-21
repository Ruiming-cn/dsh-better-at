#!/bin/bash
# dsh-better-at build: ESM host + single-file client bundle + declarations.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node build.mjs
node_modules/.bin/tsc -p tsconfig.json --emitDeclarationOnly
echo "Build complete"
