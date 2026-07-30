"""Desktop launcher — Planer.exe with embedded app."""
import json
import os
import sys
import threading
from datetime import datetime
from pathlib import Path

APP_VERSION = "1.1.0"
INITIAL_TASK_ROWS = 10
INITIAL_NOTE_ROWS = 5
WEEKLY_CLIENT_WIDTH = 1280
WEEKLY_LAYOUT = {
    "header": 76,
    "main_pad_y": 8,
    "toolbar": 42,
    "layout_gap": 16,
    "card_header": 46,
    "progress": 50,
    "tasks_head": 26,
    "day_row": 26,
    "stats": 30,
    "notes_top": 16,
    "notes_head": 26,
    "card_pad_bottom": 14,
    "bottom_gap": 23,
}


def fixed_weekly_client_height(task_rows: int, note_rows: int) -> int:
    layout = WEEKLY_LAYOUT
    row_h = layout["day_row"]
    card = (
        layout["card_header"]
        + layout["progress"]
        + layout["tasks_head"]
        + task_rows * row_h
        + layout["stats"]
        + layout["notes_top"]
        + layout["notes_head"]
        + note_rows * row_h
        + layout["card_pad_bottom"]
    )
    week = layout["toolbar"] + layout["layout_gap"] + card
    return max(
        420,
        layout["header"] + layout["main_pad_y"] + week + layout["bottom_gap"],
    )


WEEKLY_CLIENT_HEIGHT = fixed_weekly_client_height(INITIAL_TASK_ROWS, INITIAL_NOTE_ROWS)

LICENSE_HTML = """<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<title>Активация Планера</title>
<style>
  body { font-family: "Segoe UI", sans-serif; background: #faf8f6; color: #434343; margin: 0; }
  .card { width: min(400px, calc(100% - 2rem)); margin: 2rem auto; padding: 1.25rem 1.35rem 1.35rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  h2 { margin: 0 0 .45rem; font-size: 1.15rem; }
  p { color: #666; margin: 0 0 1rem; font-size: .9rem; }
  input { width: 100%; box-sizing: border-box; padding: .55rem .65rem; border: 1px solid #e8e0d8; border-radius: 8px; font-size: .9rem; margin-bottom: .65rem; }
  button { border: 1px solid #e8e0d8; background: #fff; padding: .45rem 1rem; border-radius: 8px; cursor: pointer; font-size: .85rem; }
  button:hover { background: #f0ebe5; }
  .err { color: #c62828; font-size: .85rem; margin: 0 0 .65rem; }
  .motto {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: .32rem;
    margin: 0 0 .85rem;
    padding: .38rem 1rem .42rem;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(198,40,40,.12) 0%, rgba(211,47,47,.05) 52%, rgba(183,28,28,.1) 100%);
    border: 1px solid rgba(198,40,40,.22);
    box-shadow: 0 2px 12px rgba(198,40,40,.08), inset 0 1px 0 rgba(255,255,255,.62);
    text-align: center;
    line-height: 1.25;
  }
  .motto-lead { font-weight: 700; color: #b71c1c; letter-spacing: .025em; font-size: .84rem; }
  .motto-sep { color: rgba(183,28,28,.42); font-size: .84rem; }
  .motto-tail { font-weight: 600; font-style: italic; color: #c62828; letter-spacing: .018em; font-size: .84rem; }
</style>
</head><body>
<div class="card">
  <h2>Активация Планера</h2>
  <p class="motto">
    <span class="motto-lead">Мой планер</span>
    <span class="motto-sep">—</span>
    <span class="motto-tail">твоя борьба с прокрастинацией!</span>
  </p>
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


def eula_path() -> Path | None:
    candidates = [
        Path(exe_path()).parent / "LICENSE",
        Path(app_dir()) / "LICENSE",
        Path(app_dir()).parent / "LICENSE",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


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


def tray_icon_path() -> str | None:
    from platform_support import icon_path as platform_icon_path

    for name in ("planner.png", "planner.ico", "planner.icns"):
        path = os.path.join(app_dir(), name)
        if os.path.isfile(path):
            return path
    return platform_icon_path(app_dir())


class Api:
    def __init__(self) -> None:
        self.minimize_to_tray = False
        self._tray_icon = None
        self._tray_lock = threading.Lock()
        self._closing_handler = None
        self._closing_hooked = False

    def bind_closing_handler(self, handler) -> None:
        self._closing_handler = handler

    def _attach_closing_handler(self, window) -> None:
        if self._closing_hooked or not self._closing_handler:
            return
        window.events.closing += self._closing_handler
        self._closing_hooked = True

    def set_minimize_to_tray(self, enabled: bool) -> dict:
        self.minimize_to_tray = bool(enabled)
        return {"ok": True, "enabled": self.minimize_to_tray}

    def auto_backup(self, payload: str) -> dict:
        from license import LICENSE_DIR

        try:
            data = json.loads(payload)
        except Exception as e:
            return {"ok": False, "error": f"Invalid JSON: {e}"}

        try:
            backup_dir = Path(LICENSE_DIR) / "backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            path = backup_dir / f"planer-auto-{stamp}.planer"
            with path.open("w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self._prune_auto_backups(backup_dir, keep=10)
            return {"ok": True, "path": str(path)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    @staticmethod
    def _prune_auto_backups(backup_dir: Path, keep: int = 10) -> None:
        files = sorted(backup_dir.glob("planer-auto-*.planer"), key=lambda p: p.stat().st_mtime)
        for path in files[:-keep]:
            try:
                path.unlink()
            except OSError:
                pass

    def _start_tray(self, window) -> None:
        with self._tray_lock:
            if self._tray_icon is not None:
                return
            try:
                import pystray
                from PIL import Image
            except ImportError:
                return

            icon_file = tray_icon_path()
            if not icon_file:
                return
            image = Image.open(icon_file)

            def show_window(_icon=None, _item=None) -> None:
                try:
                    window.show()
                except Exception:
                    pass

            def quit_app(_icon=None, _item=None) -> None:
                try:
                    if self._tray_icon:
                        self._tray_icon.stop()
                except Exception:
                    pass
                import webview

                for win in webview.windows:
                    try:
                        win.destroy()
                    except Exception:
                        pass
                os._exit(0)

            menu = pystray.Menu(
                pystray.MenuItem("Открыть Планер", show_window, default=True),
                pystray.MenuItem("Выход", quit_app),
            )
            self._tray_icon = pystray.Icon("Planer", image, "Планер", menu)
            threading.Thread(target=self._tray_icon.run, daemon=True).start()

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
        return {"ok": False, "error": "Сброс лицензии отключён в приложении."}

    def get_device_secret(self) -> dict:
        import secrets

        from license import LICENSE_DIR

        try:
            path = LICENSE_DIR / "device.secret"
            LICENSE_DIR.mkdir(parents=True, exist_ok=True)
            if not path.is_file():
                path.write_text(secrets.token_hex(32), encoding="utf-8")
            return {"ok": True, "secret": path.read_text(encoding="utf-8").strip()}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_app_info(self) -> dict:
        from license import LICENSE_DIR
        from platform_support import is_macos, is_windows

        if is_macos():
            platform_name = "macos"
        elif is_windows():
            platform_name = "windows"
        else:
            platform_name = "desktop"
        return {
            "version": APP_VERSION,
            "dataDir": str(LICENSE_DIR),
            "autostart": self.get_autostart().get("enabled", False),
            "platform": platform_name,
        }

    def get_license_info(self) -> dict:
        from license import LICENSE_FILE, LICENSE_DIR, is_licensed

        eula = eula_path()
        return {
            "ok": True,
            "licensed": is_licensed(),
            "licenseFile": str(LICENSE_FILE),
            "licenseDir": str(LICENSE_DIR),
            "licenseExists": LICENSE_FILE.is_file(),
            "eulaFile": str(eula) if eula else "",
            "eulaExists": bool(eula and eula.is_file()),
        }

    def open_license_file(self) -> dict:
        from license import LICENSE_FILE, LICENSE_DIR

        try:
            target = LICENSE_FILE if LICENSE_FILE.is_file() else LICENSE_DIR
            if not target.exists():
                LICENSE_DIR.mkdir(parents=True, exist_ok=True)
                target = LICENSE_DIR
            from platform_support import open_os_path

            open_os_path(target, reveal=target.is_file())
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def open_eula(self) -> dict:
        try:
            from platform_support import open_os_path

            eula = eula_path()
            if not eula:
                return {"ok": False, "error": "Файл EULA (LICENSE) не найден."}
            open_os_path(eula)
            return {"ok": True, "path": str(eula)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def copy_text(self, text: str) -> dict:
        try:
            from platform_support import copy_text_to_clipboard

            copy_text_to_clipboard(str(text))
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_donation_info(self) -> dict:
        from donation import donation_config_path, load_donation_config
        from license import LICENSE_DIR

        cfg = load_donation_config(LICENSE_DIR)
        wallet = (cfg.get("yoomoney_wallet") or "").strip()
        phone = (cfg.get("sbp_phone") or "").strip()
        return {
            "ok": True,
            "message": cfg.get("message") or "",
            "presets": cfg.get("presets") or [100, 300, 500, 1000],
            "minAmount": cfg.get("min_amount") or 50,
            "maxAmount": cfg.get("max_amount") or 100000,
            "yoomoneyEnabled": bool(wallet),
            "sbpEnabled": bool(phone),
            "yoomoneyLabel": cfg.get("yoomoney_label") or "Оплатить через ЮMoney",
            "sbpLabel": cfg.get("sbp_label") or "СБП — скопировать номер",
            "configPath": str(donation_config_path(LICENSE_DIR)),
        }

    def open_donation_payment(self, amount: float, method: str = "yoomoney") -> dict:
        import webbrowser

        from donation import load_donation_config, normalize_amount, yoomoney_url
        from license import LICENSE_DIR

        cfg = load_donation_config(LICENSE_DIR)
        normalized, error = normalize_amount(amount, cfg)
        if error:
            return {"ok": False, "error": error}
        wallet = (cfg.get("yoomoney_wallet") or "").strip()
        if not wallet:
            return {
                "ok": False,
                "error": "ЮMoney не настроен. Добавьте yoomoney_wallet в donation.json.",
            }
        webbrowser.open(yoomoney_url(wallet, normalized))
        return {"ok": True, "method": "yoomoney", "amount": normalized}

    def copy_donation_details(self, amount: float = 0) -> dict:
        from donation import load_donation_config, normalize_amount, sbp_copy_text
        from license import LICENSE_DIR

        cfg = load_donation_config(LICENSE_DIR)
        phone = (cfg.get("sbp_phone") or "").strip()
        if not phone:
            return {
                "ok": False,
                "error": "СБП не настроен. Добавьте sbp_phone в donation.json.",
            }
        normalized = None
        if amount:
            normalized, error = normalize_amount(amount, cfg)
            if error:
                return {"ok": False, "error": error}
        copied = self.copy_text(sbp_copy_text(cfg, normalized))
        if not copied.get("ok"):
            return copied
        return {"ok": True, "amount": normalized}

    def get_autostart(self) -> dict:
        try:
            from platform_support import get_autostart_enabled

            return {"ok": True, "enabled": get_autostart_enabled(exe_path())}
        except Exception as e:
            return {"ok": False, "enabled": False, "error": str(e)}

    def set_autostart(self, enabled: bool) -> dict:
        try:
            from platform_support import set_autostart_enabled

            set_autostart_enabled(exe_path(), bool(enabled))
            return {"ok": True, "enabled": bool(enabled)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def save_text_file(self, content: str, suggested_name: str = "export.txt") -> dict:
        import webview

        try:
            window = webview.windows[0]
            suggested = Path(suggested_name).name or "export.txt"
            if suggested.lower().endswith(".csv"):
                file_types = ("CSV (*.csv)", "Text files (*.txt)")
            else:
                file_types = ("Text files (*.txt)", "All files (*.*)")
            path = window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=suggested,
                file_types=file_types,
            )
            if not path:
                return {"ok": False, "cancelled": True}
            if isinstance(path, (list, tuple)):
                path = path[0]

            with open(path, "w", encoding="utf-8-sig", newline="") as f:
                f.write(content)
            return {"ok": True, "path": path}
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
            from platform_support import enable_main_window_chrome

            window = webview.windows[0]
            enable_main_window_chrome(window)
            self._attach_closing_handler(window)
            window.resize(WEEKLY_CLIENT_WIDTH, WEEKLY_CLIENT_HEIGHT)
            window.set_title("Планер")
            window.load_url(index_url())
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def is_window_maximized(self) -> dict:
        from platform_support import is_window_maximized

        return is_window_maximized()

    def resize_window(self, client_width: int, client_height: int) -> dict:
        try:
            from platform_support import resize_window

            return resize_window(client_width, client_height)
        except Exception as e:
            return {"ok": False, "error": str(e)}


def main() -> None:
    from license import is_licensed

    licensed = is_licensed()
    import webview

    api = Api()

    def on_closing() -> bool:
        if not api.minimize_to_tray:
            return True
        try:
            window = webview.windows[0]
            api._start_tray(window)
            window.hide()
        except Exception:
            pass
        return False

    api.bind_closing_handler(on_closing)

    if licensed:
        window = webview.create_window(
            "Планер",
            url=index_url(),
            width=WEEKLY_CLIENT_WIDTH,
            height=WEEKLY_CLIENT_HEIGHT,
            min_size=(900, 420),
            text_select=True,
            js_api=api,
        )
        api._attach_closing_handler(window)
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
    from platform_support import icon_path as platform_icon_path, webview_gui

    start_kwargs = {
        "http_server": False,
        "debug": False,
        "private_mode": False,
    }
    gui = webview_gui()
    if gui:
        start_kwargs["gui"] = gui
    icon = platform_icon_path(app_dir())
    if icon:
        start_kwargs["icon"] = icon
    webview.start(**start_kwargs)


if __name__ == "__main__":
    main()
