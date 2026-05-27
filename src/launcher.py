"""Desktop launcher — Planer.exe with embedded app."""
import json
import os
import sys

APP_VERSION = "1.1.0"
AUTOSTART_NAME = "Planer"
WEEKLY_CLIENT_WIDTH = 1280
WEEKLY_CLIENT_HEIGHT = 669

LICENSE_HTML = """<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<title>Активация Планера</title>
<style>
  body { font-family: "Segoe UI", sans-serif; background: #faf8f6; color: #434343; margin: 0; }
  .card { max-width: 420px; margin: 2rem auto; padding: 1.5rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  h2 { margin: 0 0 .5rem; font-size: 1.15rem; }
  p { color: #666; margin: 0 0 1rem; font-size: .9rem; }
  input { width: 100%; box-sizing: border-box; padding: .55rem .65rem; border: 1px solid #e8e0d8; border-radius: 8px; font-size: .9rem; margin-bottom: .65rem; }
  button { border: 1px solid #e8e0d8; background: #fff; padding: .45rem 1rem; border-radius: 8px; cursor: pointer; font-size: .85rem; }
  button:hover { background: #f0ebe5; }
  .err { color: #c62828; font-size: .85rem; margin: 0 0 .65rem; }
</style>
</head><body>
<div class="card">
  <h2>Активация Планера</h2>
  <p>Введите лицензионный ключ для запуска приложения.</p>
  <input id="licenseKey" placeholder="PLAN-XXXX-XXXX-XXXX-XXXX" autocomplete="off">
  <p id="licenseError" class="err" hidden></p>
  <button type="button" id="licenseActivate">Активировать</button>
</div>
<script>
function waitApi() {
  return new Promise((resolve) => {
    if (window.pywebview && window.pywebview.api) return resolve();
    window.addEventListener("pywebviewready", () => resolve(), { once: true });
    const poll = setInterval(() => {
      if (window.pywebview && window.pywebview.api) { clearInterval(poll); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(poll); resolve(); }, 15000);
  });
}
async function activate() {
  const err = document.getElementById("licenseError");
  err.hidden = true;
  await waitApi();
  if (!window.pywebview || !window.pywebview.api) {
    err.textContent = "Не удалось подключить проверку лицензии.";
    err.hidden = false;
    return;
  }
  const key = document.getElementById("licenseKey").value.trim();
  const res = await window.pywebview.api.activate_license(key);
  if (!res.ok) {
    err.textContent = res.error || "Не удалось активировать ключ.";
    err.hidden = false;
    return;
  }
  const load = await window.pywebview.api.load_main_app();
  if (!load.ok) {
    err.textContent = load.error || "Не удалось открыть приложение.";
    err.hidden = false;
  }
}
document.getElementById("licenseActivate").onclick = () => void activate();
document.getElementById("licenseKey").onkeydown = (e) => { if (e.key === "Enter") void activate(); };
waitApi().then(() => document.getElementById("licenseKey").focus());
</script>
</body></html>"""


def app_dir() -> str:
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def exe_path() -> str:
    if getattr(sys, "frozen", False):
        return sys.executable
    return os.path.abspath(__file__)


def index_url() -> str:
    path = os.path.join(app_dir(), "app.html" if getattr(sys, "frozen", False) else "index.html")
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    url = path.replace("\\", "/")
    if getattr(sys, "frozen", False):
        return f"{url}?desktop=1"
    return url


def icon_path() -> str | None:
    path = os.path.join(app_dir(), "planner.ico")
    return path if os.path.isfile(path) else None


def _autostart_key():
    import winreg

    return winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        0,
        winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
    )


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

    def clear_license(self) -> dict:
        from license import clear_license

        clear_license()
        return {"ok": True}

    def get_app_info(self) -> dict:
        from license import LICENSE_DIR

        return {
            "version": APP_VERSION,
            "dataDir": str(LICENSE_DIR),
            "autostart": self.get_autostart().get("enabled", False),
        }

    def get_autostart(self) -> dict:
        try:
            import winreg

            key = _autostart_key()
            try:
                winreg.QueryValueEx(key, AUTOSTART_NAME)
                enabled = True
            except FileNotFoundError:
                enabled = False
            winreg.CloseKey(key)
            return {"ok": True, "enabled": enabled}
        except Exception as e:
            return {"ok": False, "enabled": False, "error": str(e)}

    def set_autostart(self, enabled: bool) -> dict:
        try:
            import winreg

            key = _autostart_key()
            if enabled:
                winreg.SetValueEx(key, AUTOSTART_NAME, 0, winreg.REG_SZ, f'"{exe_path()}"')
            else:
                try:
                    winreg.DeleteValue(key, AUTOSTART_NAME)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
            return {"ok": True, "enabled": bool(enabled)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

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

    def load_backup(self) -> dict:
        import webview

        try:
            window = webview.windows[0]
            path = window.create_file_dialog(
                webview.OPEN_DIALOG,
                file_types=("Planer Backup (*.planer)", "JSON Files (*.json)", "All files (*.*)"),
            )
            if not path:
                return {"ok": False, "cancelled": True}
            if isinstance(path, (list, tuple)):
                path = path[0]
            with open(path, encoding="utf-8") as f:
                content = f.read()
            return {"ok": True, "content": content, "path": path}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def load_main_app(self) -> dict:
        import webview
        from license import is_licensed

        if not is_licensed():
            return {"ok": False, "error": "Лицензия не активирована."}
        try:
            window = webview.windows[0]
            window.resize(WEEKLY_CLIENT_WIDTH, WEEKLY_CLIENT_HEIGHT)
            window.set_title("Планер")
            window.load_url(index_url())
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def is_window_maximized(self) -> dict:
        import webview

        try:
            from System.Windows.Forms import FormWindowState
            from webview.platforms import winforms

            browser = winforms.BrowserView.instances.get(webview.windows[0].uid)
            if browser is None:
                return {"ok": True, "maximized": False}
            return {"ok": True, "maximized": browser.WindowState == FormWindowState.Maximized}
        except Exception as e:
            return {"ok": False, "maximized": False, "error": str(e)}

    def resize_window(self, client_width: int, client_height: int) -> dict:
        import webview
        from System import Func, Type
        from System.Drawing import Size
        from webview.platforms import winforms

        try:
            target_w = max(int(client_width), 900)
            target_h = max(int(client_height), 420)
            window = webview.windows[0]
            browser = winforms.BrowserView.instances.get(window.uid)

            def _apply() -> None:
                browser.ClientSize = Size(target_w, target_h)

            if browser is None:
                window.resize(target_w, target_h)
            elif browser.InvokeRequired:
                browser.Invoke(Func[Type](_apply))
            else:
                _apply()
            return {"ok": True, "width": target_w, "height": target_h}
        except Exception as e:
            return {"ok": False, "error": str(e)}


def main() -> None:
    import webview
    from license import is_licensed

    api = Api()
    if is_licensed():
        window = webview.create_window(
            "Планер",
            url=index_url(),
            width=WEEKLY_CLIENT_WIDTH,
            height=WEEKLY_CLIENT_HEIGHT,
            min_size=(900, 420),
            text_select=True,
            js_api=api,
        )
    else:
        webview.create_window(
            "Активация Планера",
            html=LICENSE_HTML,
            width=480,
            height=320,
            resizable=False,
            text_select=True,
            js_api=api,
        )
    start_kwargs = {
        "gui": "edgechromium",
        "http_server": False,
        "debug": False,
        "private_mode": False,
    }
    icon = icon_path()
    if icon:
        start_kwargs["icon"] = icon
    webview.start(**start_kwargs)


if __name__ == "__main__":
    main()
