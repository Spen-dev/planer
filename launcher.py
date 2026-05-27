"""Desktop launcher — single Planer.exe with embedded app."""
import os
import sys
import webview


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


def main() -> None:
    webview.create_window(
        "Планер",
        url=index_path(),
        width=1280,
        height=800,
        min_size=(900, 600),
        text_select=True,
    )
    webview.start(gui="edgechromium")


if __name__ == "__main__":
    main()
