"""Desktop launcher for the planner web app."""
import os
import sys
import webview


def app_dir() -> str:
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def main() -> None:
    root = app_dir()
    index = os.path.join(root, "index.html")
    if not os.path.isfile(index):
        raise FileNotFoundError(f"index.html not found in {root}")

    webview.create_window(
        "Планер",
        url=index,
        width=1280,
        height=800,
        min_size=(900, 600),
        text_select=True,
    )
    webview.start()


if __name__ == "__main__":
    main()
