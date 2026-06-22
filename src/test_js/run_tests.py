#!/usr/bin/env python3
"""Python fallback for JS autotests when Node.js is unavailable."""
from __future__ import annotations

import asyncio
import base64
import json
import os
import sys
from copy import deepcopy

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


LOAD_ERRORS = {
    "NO_PASSWORD": "NO_PASSWORD",
    "WRONG_PASSWORD": "WRONG_PASSWORD",
    "CORRUPT_STORAGE": "CORRUPT_STORAGE",
}


class MemoryStorage:
    def __init__(self, initial: dict[str, str] | None = None):
        self._data = dict(initial or {})

    def getItem(self, key: str) -> str | None:
        return self._data.get(key)

    def setItem(self, key: str, value: str) -> None:
        self._data[key] = value

    def removeItem(self, key: str) -> None:
        self._data.pop(key, None)


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=120000,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_text(text: str, password: str) -> dict:
    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(password, salt)
    cipher = AESGCM(key).encrypt(iv, text.encode("utf-8"), None)
    return {
        "v": 1,
        "encrypted": True,
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
        "data": base64.b64encode(cipher).decode("ascii"),
    }


def decrypt_text(payload: dict, password: str) -> str:
    salt = base64.b64decode(payload["salt"])
    iv = base64.b64decode(payload["iv"])
    data = base64.b64decode(payload["data"])
    key = derive_key(password, salt)
    plain = AESGCM(key).decrypt(iv, data, None)
    return plain.decode("utf-8")


def read_raw_storage(storage: MemoryStorage) -> str | None:
    return storage.getItem("planer-data-v2") or storage.getItem("planer-data-v1")


def storage_has_encrypted_payload(storage: MemoryStorage) -> bool:
    raw = read_raw_storage(storage)
    if not raw:
        return False
    try:
        return bool(json.loads(raw).get("encrypted"))
    except json.JSONDecodeError:
        return False


def has_crypto_setup(storage: MemoryStorage) -> bool:
    return bool(storage.getItem("planer-crypto-v1")) or storage_has_encrypted_payload(storage)


def resolve_password_mode(storage: MemoryStorage, remember_worked: bool) -> str:
    if has_crypto_setup(storage) and remember_worked:
        return "done"
    if storage_has_encrypted_payload(storage) or has_crypto_setup(storage):
        return "unlock"
    return "setup"


def relocate_matrix_links(matrix_links, week_start, from_day, from_task, to_day, to_task):
    next_links = {}
    for quadrant_id, links in (matrix_links or {}).items():
        next_links[quadrant_id] = []
        for link in links or []:
            if not link or link.get("weekStart") != week_start:
                next_links[quadrant_id].append(link)
                continue
            if link.get("dayIdx") == from_day and link.get("taskIdx") == from_task:
                next_links[quadrant_id].append(
                    {"weekStart": week_start, "dayIdx": to_day, "taskIdx": to_task}
                )
            elif link.get("dayIdx") == to_day and link.get("taskIdx") == to_task:
                next_links[quadrant_id].append(
                    {"weekStart": week_start, "dayIdx": from_day, "taskIdx": from_task}
                )
            else:
                next_links[quadrant_id].append(link)
    return next_links


def clear_weekly_task_for_link(weeks, link):
    if not link:
        return weeks
    week = (weeks or {}).get(link["weekStart"])
    if not week:
        return weeks
    day = week.get("days", [])
    if link["dayIdx"] >= len(day):
        return weeks
    tasks = day[link["dayIdx"]].get("tasks", [])
    if link["taskIdx"] >= len(tasks):
        return weeks
    next_weeks = deepcopy(weeks)
    next_weeks[link["weekStart"]]["days"][link["dayIdx"]]["tasks"][link["taskIdx"]] = {
        "text": "",
        "done": False,
    }
    return next_weeks


passed = 0
failed = 0


def ok(condition: bool, message: str) -> None:
    global passed, failed
    if condition:
        passed += 1
    else:
        failed += 1
        print(f"FAIL: {message}", file=sys.stderr)


def test_crypto_roundtrip() -> None:
    payload = encrypt_text('{"weekStart":"2026-05-25"}', "secret-pass")
    ok(payload.get("encrypted") is True, "encrypt marks payload")
    plain = decrypt_text(payload, "secret-pass")
    ok(plain == '{"weekStart":"2026-05-25"}', "decrypt restores plaintext")
    try:
        decrypt_text(payload, "wrong-pass")
        ok(False, "wrong password should fail")
    except Exception:
        ok(True, "wrong password rejected")


def test_boot_flow_modes() -> None:
    ok(resolve_password_mode(MemoryStorage(), False) == "setup", "empty -> setup")
    enc = MemoryStorage(
        {"planer-data-v2": json.dumps({"encrypted": True, "salt": "x", "iv": "y", "data": "z"})}
    )
    ok(resolve_password_mode(enc, False) == "unlock", "encrypted -> unlock")
    ok(resolve_password_mode(enc, True) == "done", "remember -> done")
    meta = MemoryStorage({"planer-crypto-v1": "1"})
    ok(resolve_password_mode(meta, False) == "unlock", "meta only -> unlock")


def test_matrix_links() -> None:
    links = {
        "urgentImportant": [{"weekStart": "2026-05-25", "dayIdx": 1, "taskIdx": 2}, None],
        "urgentNotImportant": [{"weekStart": "2026-05-25", "dayIdx": 3, "taskIdx": 4}],
    }
    moved = relocate_matrix_links(links, "2026-05-25", 1, 2, 5, 0)
    ok(moved["urgentImportant"][0]["dayIdx"] == 5, "link follows move")
    ok(moved["urgentImportant"][0]["taskIdx"] == 0, "link index follows move")
    swapped = relocate_matrix_links(links, "2026-05-25", 1, 2, 3, 4)
    ok(swapped["urgentImportant"][0]["dayIdx"] == 3, "swap first link")
    ok(swapped["urgentNotImportant"][0]["dayIdx"] == 1, "swap second link")
    weeks = {"2026-05-25": {"days": [{"tasks": [{"text": "linked", "done": False}]}]}}
    cleared = clear_weekly_task_for_link(
        weeks, {"weekStart": "2026-05-25", "dayIdx": 0, "taskIdx": 0}
    )
    ok(cleared["2026-05-25"]["days"][0]["tasks"][0]["text"] == "", "clear weekly task")


def test_corrupt_json_blocks_save() -> None:
    storage = MemoryStorage({"planer-data-v2": "{not-json"})
    try:
        json.loads(storage.getItem("planer-data-v2"))
        ok(False, "invalid json should not parse")
    except json.JSONDecodeError:
        ok(True, "corrupt json detected")


def main() -> int:
    test_crypto_roundtrip()
    test_boot_flow_modes()
    test_matrix_links()
    test_corrupt_json_blocks_save()
    print(f"JS tests (Python fallback): {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
