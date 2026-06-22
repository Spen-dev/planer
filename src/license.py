"""Offline license validation for Planer."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
from pathlib import Path

# Change this secret before distributing keys to customers.
LICENSE_SECRET = b"planer-protect-v1-spen-dev-change-me"

LICENSE_DIR = Path(os.environ.get("APPDATA", Path.home())) / "Planer"
LICENSE_FILE = LICENSE_DIR / "license.dat"

KEY_PATTERN = re.compile(
    r"^PLAN-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$"
)
TOKEN_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def normalize_key(key: str) -> str:
    return key.strip().upper().replace(" ", "")


def make_license_key(seed: str) -> str:
    body = hmac.new(LICENSE_SECRET, seed.encode("utf-8"), hashlib.sha256).hexdigest()[:12].upper()
    check = hmac.new(LICENSE_SECRET, body.encode("utf-8"), hashlib.sha256).hexdigest()[:4].upper()
    token = body + check
    return f"PLAN-{token[0:4]}-{token[4:8]}-{token[8:12]}-{token[12:16]}"


def validate_license_key(key: str) -> bool:
    normalized = normalize_key(key)
    if not KEY_PATTERN.match(normalized):
        return False
    body = normalized.replace("PLAN-", "").replace("-", "")
    expected = hmac.new(
        LICENSE_SECRET,
        body[:12].encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:4].upper()
    return body[12:16] == expected


def license_token(key: str) -> str:
    normalized = normalize_key(key)
    return hashlib.sha256(normalized.encode("utf-8") + LICENSE_SECRET).hexdigest()


def is_valid_token(token: str) -> bool:
    return bool(token and TOKEN_PATTERN.match(token))


def is_licensed() -> bool:
    if not LICENSE_FILE.is_file():
        return False
    try:
        data = json.loads(LICENSE_FILE.read_text(encoding="utf-8"))
        key = normalize_key(str(data.get("key", "")))
        token = str(data.get("token", ""))
        if not key or not validate_license_key(key):
            return False
        return token == license_token(key)
    except (OSError, json.JSONDecodeError):
        return False


def save_license(key: str) -> None:
    LICENSE_DIR.mkdir(parents=True, exist_ok=True)
    normalized = normalize_key(key)
    LICENSE_FILE.write_text(
        json.dumps({"key": normalized, "token": license_token(normalized)}, ensure_ascii=False),
        encoding="utf-8",
    )


def activate_license(key: str) -> tuple[bool, str]:
    if not validate_license_key(key):
        return False, "Неверный лицензионный ключ."
    save_license(key)
    return True, ""


def clear_license() -> None:
    if LICENSE_FILE.is_file():
        LICENSE_FILE.unlink()
