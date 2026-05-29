"""Tests for Planer license and date helpers."""
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from license import (
    activate_license,
    is_licensed,
    is_valid_token,
    license_token,
    make_license_key,
    validate_license_key,
)


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def to_date_string(d: date) -> str:
    return d.isoformat()


def add_days(date_str: str, n: int) -> str:
    d = date.fromisoformat(date_str)
    return to_date_string(d + timedelta(days=n))


class LicenseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.license_dir = Path(self.tmp.name)

    def test_make_and_validate_key(self):
        key = make_license_key("test-seed-001")
        self.assertTrue(validate_license_key(key))
        self.assertFalse(validate_license_key("PLAN-0000-0000-0000-0000"))

    def test_token_format(self):
        key = make_license_key("token-test")
        token = license_token(key)
        self.assertTrue(is_valid_token(token))
        self.assertFalse(is_valid_token("bad"))

    def test_activate_writes_valid_license(self):
        key = make_license_key("activate-test")
        license_file = self.license_dir / "license.dat"
        with patch("license.LICENSE_DIR", self.license_dir), patch("license.LICENSE_FILE", license_file):
            ok, err = activate_license(key)
            self.assertTrue(ok, err)
            self.assertTrue(license_file.is_file())
            self.assertTrue(is_licensed())


class DateTests(unittest.TestCase):
    def test_monday_of_wednesday(self):
        wed = date(2026, 5, 27)
        self.assertEqual(monday_of(wed), date(2026, 5, 25))

    def test_monday_of_sunday(self):
        sun = date(2026, 5, 31)
        self.assertEqual(monday_of(sun), date(2026, 5, 25))

    def test_add_days_week(self):
        start = "2026-05-25"
        self.assertEqual(add_days(start, 7), "2026-06-01")
        self.assertEqual(add_days(start, -7), "2026-05-18")


class AutoBackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.license_dir = Path(self.tmp.name)

    def test_auto_backup_writes_and_prunes(self):
        from launcher import Api

        backup_dir = self.license_dir / "backups"
        with patch("license.LICENSE_DIR", self.license_dir):
            api = Api()
            payload = json.dumps({"version": 1, "state": {"weekStart": "2026-05-25"}})
            res = api.auto_backup(payload)
            self.assertTrue(res["ok"], res.get("error"))
            self.assertTrue(Path(res["path"]).is_file())

            for i in range(12):
                res = api.auto_backup(payload)
                self.assertTrue(res["ok"], res.get("error"))

            files = list(backup_dir.glob("planer-auto-*.planer"))
            self.assertLessEqual(len(files), 10)


class SaveTextFileTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out_path = Path(self.tmp.name) / "planer-stats.csv"

    def test_save_text_file_writes_csv(self):
        from launcher import Api

        out_path = self.out_path

        class FakeWindow:
            def create_file_dialog(self, *_args, **_kwargs):
                return str(out_path)

        with patch("webview.windows", [FakeWindow()]):
            api = Api()
            res = api.save_text_file("day;done\r\nMon;1", "planer-stats.csv")

        self.assertTrue(res["ok"], res.get("error"))
        text = self.out_path.read_text(encoding="utf-8-sig")
        self.assertIn("day;done", text)
        self.assertIn("Mon;1", text)


if __name__ == "__main__":
    unittest.main()
