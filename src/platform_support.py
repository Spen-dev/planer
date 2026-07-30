"""Platform-specific helpers for the Planer desktop shell."""
from __future__ import annotations

import os
import plistlib
import subprocess
import sys
from pathlib import Path

AUTOSTART_NAME = "Planer"
MAC_AUTOSTART_LABEL = "com.spen.planer"


def is_windows() -> bool:
    return sys.platform == "win32"


def is_macos() -> bool:
    return sys.platform == "darwin"


def open_os_path(path: Path, *, reveal: bool = False) -> None:
    resolved = path.resolve()
    if is_macos():
        args = ["open"]
        if reveal and resolved.is_file():
            args.extend(["-R", str(resolved)])
        else:
            args.append(str(resolved))
        subprocess.run(args, check=False)
        return
    if is_windows():
        if reveal and resolved.is_file():
            subprocess.run(["explorer", "/select,", str(resolved)], check=False)
            return
        os.startfile(str(resolved))
        return
    subprocess.run(["xdg-open", str(resolved)], check=False)


def copy_text_to_clipboard(text: str) -> None:
    payload = str(text)
    if is_macos():
        subprocess.run(["pbcopy"], input=payload.encode("utf-8"), check=True)
        return
    if is_windows():
        subprocess.run("clip", input=payload.encode("utf-16le"), check=True, shell=True)
        return
    subprocess.run(["xclip", "-selection", "clipboard"], input=payload.encode("utf-8"), check=True)


def get_autostart_enabled(exe_path: str) -> bool:
    if is_windows():
        import winreg

        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_QUERY_VALUE,
        )
        try:
            winreg.QueryValueEx(key, AUTOSTART_NAME)
            return True
        except FileNotFoundError:
            return False
        finally:
            winreg.CloseKey(key)
    if is_macos():
        return mac_launch_agent_path().is_file()
    return False


def set_autostart_enabled(exe_path: str, enabled: bool) -> None:
    if is_windows():
        import winreg

        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE,
        )
        try:
            if enabled:
                winreg.SetValueEx(key, AUTOSTART_NAME, 0, winreg.REG_SZ, f'"{exe_path}"')
            else:
                try:
                    winreg.DeleteValue(key, AUTOSTART_NAME)
                except FileNotFoundError:
                    pass
        finally:
            winreg.CloseKey(key)
        return
    if is_macos():
        plist_path = mac_launch_agent_path()
        if enabled:
            plist_path.parent.mkdir(parents=True, exist_ok=True)
            plist = {
                "Label": MAC_AUTOSTART_LABEL,
                "ProgramArguments": autostart_program_arguments(exe_path),
                "RunAtLoad": True,
            }
            with plist_path.open("wb") as handle:
                plistlib.dump(plist, handle)
        elif plist_path.is_file():
            plist_path.unlink()
        return
    raise RuntimeError("Autostart is not supported on this platform.")


def mac_launch_agent_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / f"{MAC_AUTOSTART_LABEL}.plist"


def autostart_program_arguments(exe_path: str) -> list[str]:
    if not is_macos():
        return [exe_path]

    path = Path(exe_path)
    if path.suffix == ".app":
        return ["/usr/bin/open", "-a", str(path)]
    if path.parent.name == "MacOS" and path.parent.parent.name == "Contents":
        app_bundle = path.parent.parent.parent
        if app_bundle.suffix == ".app":
            return [str(path)]
    return [exe_path]


def enable_main_window_chrome(window) -> None:
    if not is_windows():
        window.resizable = True
        if getattr(window, "min_size", None) is None:
            window.min_size = (900, 420)
        return

    from System import Func, Type
    from System.Drawing import Size
    from System.Windows.Forms import FormBorderStyle
    from webview.platforms import winforms

    window.resizable = True
    window.min_size = (900, 420)

    browser = winforms.BrowserView.instances.get(window.uid)
    if browser is None:
        return

    def _apply() -> None:
        scale = browser._scale
        browser.FormBorderStyle = FormBorderStyle.Sizable
        browser.MaximizeBox = True
        browser.MinimizeBox = True
        browser.MinimumSize = Size(int(900 * scale), int(420 * scale))

    if browser.InvokeRequired:
        browser.Invoke(Func[Type](_apply))
    else:
        _apply()


def resize_window(client_width: int, client_height: int) -> dict:
    import webview

    target_w = max(int(client_width), 900)
    target_h = max(int(client_height), 420)
    window = webview.windows[0]

    if is_windows():
        from System import Func, Type
        from System.Drawing import Size
        from webview.platforms import winforms

        browser = winforms.BrowserView.instances.get(window.uid)

        def _apply() -> None:
            browser.ClientSize = Size(target_w, target_h)

        if browser is None:
            window.resize(target_w, target_h)
        elif browser.InvokeRequired:
            browser.Invoke(Func[Type](_apply))
        else:
            _apply()
    else:
        window.resize(target_w, target_h)

    return {"ok": True, "width": target_w, "height": target_h}


def is_window_maximized() -> dict:
    if not is_windows():
        return {"ok": True, "maximized": False}

    import webview

    try:
        from System.Windows.Forms import FormWindowState
        from webview.platforms import winforms

        browser = winforms.BrowserView.instances.get(webview.windows[0].uid)
        if browser is None:
            return {"ok": True, "maximized": False}
        return {"ok": True, "maximized": browser.WindowState == FormWindowState.Maximized}
    except Exception as exc:
        return {"ok": False, "maximized": False, "error": str(exc)}


def webview_gui() -> str | None:
    if is_windows():
        return "edgechromium"
    return None


def icon_path(app_dir: str) -> str | None:
    if is_macos():
        for name in ("planner.icns", "planner.ico"):
            path = os.path.join(app_dir, name)
            if os.path.isfile(path):
                return path
        return None
    path = os.path.join(app_dir, "planner.ico")
    return path if os.path.isfile(path) else None
