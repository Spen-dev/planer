"""Desktop launcher — Planer.exe with embedded app."""
import json
import os
import sys


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


def ensure_license_interactive() -> None:
    from license import activate_license, is_licensed

    if is_licensed():
        return

    import tkinter as tk
    from tkinter import messagebox, simpledialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    while not is_licensed():
        key = simpledialog.askstring(
            "Планер — активация",
            "Введите лицензионный ключ:\nPLAN-XXXX-XXXX-XXXX-XXXX",
            parent=root,
        )
        if not key:
            root.destroy()
            sys.exit(0)
        ok, error = activate_license(key)
        if not ok:
            messagebox.showerror("Планер", error, parent=root)

    root.destroy()


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
    if getattr(sys, "frozen", False):
        ensure_license_interactive()

    import webview

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
