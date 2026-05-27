"""Bundle index.html, styles.css and app.js into a single app.html for the EXE."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
js = (ROOT / "app.js").read_text(encoding="utf-8")


def minify_css(code: str) -> str:
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"\s+", " ", code)
    return code.strip()


def minify_js(code: str) -> str:
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    lines = []
    for line in code.splitlines():
        stripped = re.sub(r"\s+//.*$", "", line)
        if stripped.strip():
            lines.append(stripped.strip())
    return "\n".join(lines)


css = minify_css(css)
js = minify_js(js)

html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    f"<style>{css}</style>",
)
html = html.replace(
    '<script src="app.js"></script>',
    f"<script>\n{js}\n</script>",
)

(ROOT / "app.html").write_text(html, encoding="utf-8")
print("Created app.html")
