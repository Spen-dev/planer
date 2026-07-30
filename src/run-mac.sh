#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Installing runtime dependencies..."
python3 -m pip install -q pywebview pillow pystray rjsmin

echo
echo "Creating icon (if missing)..."
if [[ ! -f planner.png ]]; then
  python3 create_icon.py
fi

echo
echo "Starting Planer..."
python3 launcher.py
