"""Application data paths for all desktop platforms."""
from __future__ import annotations

import os
import sys
from pathlib import Path


def app_data_dir() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Planer"
    if os.name == "nt":
        return Path(os.environ.get("APPDATA", Path.home())) / "Planer"
    return Path.home() / ".local" / "share" / "Planer"


LICENSE_DIR = app_data_dir()
LICENSE_FILE = LICENSE_DIR / "license.dat"
