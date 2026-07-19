#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
ASSETS="$(cd "$(dirname "$0")" && pwd)/app/src/main/assets"

mkdir -p "$ASSETS/js"
cp "$SRC/index.html" "$ASSETS/index.html"
cp "$SRC/styles.css" "$ASSETS/styles.css"
cp "$SRC/mobile.css" "$ASSETS/mobile.css"
cp "$SRC/js/"*.js "$ASSETS/js/"
if [[ -f "$ROOT/LICENSE" ]]; then
  cp "$ROOT/LICENSE" "$ASSETS/eula.txt"
fi

echo "Synced web assets to $ASSETS"
