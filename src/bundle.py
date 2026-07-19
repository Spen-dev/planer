"""Bundle index.html, styles.css and js/*.js into app.html + app.bundle.js for the EXE."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")

js_files = [
    ROOT / "js" / "android-shim.js",
    ROOT / "js" / "storage.js",
    ROOT / "js" / "matrix_links.js",
    ROOT / "js" / "core.js",
    ROOT / "js" / "weekly.js",
    ROOT / "js" / "matrix.js",
    ROOT / "js" / "stats.js",
    ROOT / "js" / "features.js",
    ROOT / "js" / "settings.js",
    ROOT / "js" / "donate.js",
    ROOT / "js" / "protect.js",
    ROOT / "js" / "app.js",
]
js = "\n".join(path.read_text(encoding="utf-8") for path in js_files)


def minify_css(code: str) -> str:
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"\s+", " ", code)
    return code.strip()


def minify_js(code: str) -> str:
    try:
        import rjsmin

        return rjsmin.jsmin(code)
    except ImportError:
        code = re.sub(r"/\*[\s\S]*?\*/", "", code)
        lines = []
        for line in code.splitlines():
            stripped = re.sub(r"\s+//.*$", "", line)
            if stripped.strip():
                lines.append(stripped.strip())
        return "\n".join(lines)


css = minify_css(css)
js = minify_js("window.__PLANER_DESKTOP__=true;\n" + js)

(ROOT / "app.bundle.js").write_text(js, encoding="utf-8")

html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    f"<style>{css}</style>",
)
for path in js_files:
    tag = f'<script src="{path.relative_to(ROOT).as_posix()}"></script>'
    html = html.replace(tag, "")
html = html.replace("</body>", '<script src="app.bundle.js"></script>\n</body>')

(ROOT / "app.html").write_text(html, encoding="utf-8")
print("Created app.html and app.bundle.js")
