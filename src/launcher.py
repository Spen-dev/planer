"""Desktop launcher — Planer.exe with embedded app."""
import json
import os
import sys


def app_dir() -> str:
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def index_url() -> str:
    path = os.path.join(app_dir(), "app.html" if getattr(sys, "frozen", False) else "index.html")
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    url = path.replace("\\", "/")
    if getattr(sys, "frozen", False):
        from license import is_licensed

        if is_licensed():
            return f"{url}#licensed=1"
    return url


class Api:
    def check_license(self) -> dict:
        from license import is_licensed

        return {"ok": is_licensed(), "required": True}

    def activate_license(self, key: str) -> dict:
        from license import activate_license

        ok, error = activate_license(key)
        if ok:
            return {"ok": True}
        return {"ok": False, "error": error}

    def save_backup(self, payload: str) -> dict:
        import webview

        try:
            data = json.loads(payload)
        except Exception as e:
            return {"ok": False, "error": f"Invalid JSON: {e}"}

        try:
            window = webview.windows[0]
            path = window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename="planer-backup.planer",
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
    import webview

    webview.create_window(
        "Планер",
        url=index_url(),
        width=1280,
        height=720,
        min_size=(900, 650),
        text_select=True,
        js_api=Api(),
    )
    webview.start(gui="edgechromium", http_server=False, debug=False, private_mode=False)


if __name__ == "__main__":
    main()
