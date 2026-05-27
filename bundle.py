"""Bundle index.html, styles.css and app.js into a single app.html for the EXE."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
js = (ROOT / "app.js").read_text(encoding="utf-8")

html = html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    f"<style>\n{css}\n</style>",
)
html = html.replace(
    '<script src="app.js"></script>',
    f"<script>\n{js}\n</script>",
)

(ROOT / "app.html").write_text(html, encoding="utf-8")
print("Created app.html")
