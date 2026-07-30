#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Installing build dependencies..."
python3 -m pip install -q -r requirements-mac.txt

echo
echo "Creating application icon..."
python3 create_icon.py

echo
echo "Bundling app into one HTML file..."
python3 bundle.py
if [[ ! -f app.html ]]; then
  echo "ERROR: app.html was not created."
  exit 1
fi
if [[ ! -f app.bundle.js ]]; then
  echo "ERROR: app.bundle.js was not created."
  exit 1
fi

ICON_ARG=()
if [[ -f planner.icns ]]; then
  ICON_ARG=(--icon planner.icns)
elif [[ -f planner.ico ]]; then
  ICON_ARG=(--icon planner.ico)
fi

ADD_ICON=()
if [[ -f planner.icns ]]; then
  ADD_ICON=(--add-data "planner.icns:.")
elif [[ -f planner.ico ]]; then
  ADD_ICON=(--add-data "planner.ico:.")
fi

echo
echo "Building Planer.app..."
python3 -m PyInstaller --noconfirm --clean --windowed --name Planer \
  "${ICON_ARG[@]}" \
  --optimize=2 \
  --add-data "app.html:." \
  --add-data "app.bundle.js:." \
  --add-data "planner.png:." \
  "${ADD_ICON[@]}" \
  --add-data "../LICENSE:." \
  --noupx \
  --exclude-module numpy \
  --exclude-module PIL \
  --exclude-module pandas \
  --exclude-module matplotlib \
  --exclude-module scipy \
  --exclude-module pytest \
  --exclude-module pygments \
  --exclude-module jinja2 \
  --exclude-module mako \
  --exclude-module pydoc \
  --exclude-module doctest \
  --exclude-module unittest \
  --exclude-module tkinter \
  --exclude-module _tkinter \
  --exclude-module turtle \
  --exclude-module curses \
  --hidden-import pystray \
  launcher.py

if [[ ! -d dist/Planer.app ]]; then
  echo "Build failed."
  exit 1
fi

rm -rf ../Planer.app
mv dist/Planer.app ../Planer.app
rm -rf build dist Planer.spec app.html app.bundle.js

echo
echo "Done: ../Planer.app"
