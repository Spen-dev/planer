"""Desktop launcher — single Planer.exe with embedded app."""
import os
import sys
import json
import webview

from license import activate_license, is_licensed


def app_dir() -> str:
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def index_path() -> str:
    root = app_dir()
    name = "app.html" if getattr(sys, "frozen", False) else "index.html"
    path = os.path.join(root, name)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"{name} not found in {root}")
    return path


class Api:
    def check_license(self) -> dict:
        return {"ok": is_licensed(), "required": True}

    def activate_license(self, key: str) -> dict:
        ok, error = activate_license(key)
        if ok:
            return {"ok": True}
        return {"ok": False, "error": error}

    def save_backup(self, payload: str) -> dict:
        try:
            data = json.loads(payload)
        except Exception as e:
            return {"ok": False, "error": f"Invalid JSON: {e}"}

        try:
            window = webview.windows[0]
            default_name = "planer-backup.planer"
            if isinstance(data, dict) and data.get("encrypted"):
                default_name = "planer-backup.planer"
            path = window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=default_name,
                file_types=("Planer Backup (*.planer)", "JSON Files (*.json)"),
            )
            if not path:
                return {"ok": False, "cancelled": True}
            if isinstance(path, (list, tuple)):
                path = path[0]

            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return {"ok": True, "path": path}
        except Exception as e:
            return {"ok": False, "error": str(e)}


def main() -> None:
    webview.create_window(
        "Планер",
        url=index_path(),
        width=1280,
        height=800,
        min_size=(900, 600),
        text_select=True,
        js_api=Api(),
    )
    webview.start(gui="edgechromium", http_server=False, debug=False, private_mode=False)


if __name__ == "__main__":
    main()
