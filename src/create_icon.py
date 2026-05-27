"""Generate Planer application icon."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "planner.ico"

BG_TOP = (246, 201, 158)
BG_BOTTOM = (253, 180, 166)
SHEET = (255, 252, 248)
GRID = (232, 214, 200)
ACCENT = (198, 143, 110)
CHECK = (120, 168, 132)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        color = (
            lerp(BG_TOP[0], BG_BOTTOM[0], t),
            lerp(BG_TOP[1], BG_BOTTOM[1], t),
            lerp(BG_TOP[2], BG_BOTTOM[2], t),
            255,
        )
        draw.line([(0, y), (size, y)], fill=color)
    return img


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def draw_icon(size: int) -> Image.Image:
    base = gradient(size)
    mask = rounded_mask(size, max(size // 5, 8))
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    pad = size * 0.16
    sheet = [pad, pad * 1.15, size - pad, size - pad]
    sheet_radius = max(int(size * 0.08), 6)
    draw.rounded_rectangle(sheet, radius=sheet_radius, fill=SHEET)

    header_h = (sheet[3] - sheet[1]) * 0.18
    draw.rounded_rectangle(
        [sheet[0], sheet[1], sheet[2], sheet[1] + header_h],
        radius=sheet_radius,
        fill=ACCENT,
    )

    cols, rows = 7, 4
    left, top = sheet[0] + size * 0.07, sheet[1] + header_h + size * 0.05
    right, bottom = sheet[2] - size * 0.07, sheet[3] - size * 0.07
    cell_w = (right - left) / cols
    cell_h = (bottom - top) / rows

    for r in range(rows + 1):
        y = top + r * cell_h
        draw.line([(left, y), (right, y)], fill=GRID, width=max(1, size // 64))
    for c in range(cols + 1):
        x = left + c * cell_w
        draw.line([(x, top), (x, bottom)], fill=GRID, width=max(1, size // 64))

    # Highlight a completed task cell
    cx = left + cell_w * 2.5
    cy = top + cell_h * 1.5
    r = min(cell_w, cell_h) * 0.22
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CHECK)
    w = max(2, size // 48)
    draw.line(
        [(cx - r * 0.45, cy), (cx - r * 0.05, cy + r * 0.35), (cx + r * 0.55, cy - r * 0.35)],
        fill=(255, 255, 255),
        width=w,
    )

    # Small dots for other days
    for i, (dx, dy) in enumerate([(1, 0), (4, 0), (5, 2), (0, 3), (6, 3)]):
        dot_x = left + cell_w * (dx + 0.5)
        dot_y = top + cell_h * (dy + 0.5)
        dot_r = max(2, size // 80)
        color = ACCENT if i % 2 == 0 else CHECK
        draw.ellipse((dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r), fill=color)

    return icon


def main() -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [draw_icon(s) for s in sizes]
    images[0].save(
        OUT,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )
    print(f"Created {OUT.name}")


if __name__ == "__main__":
    main()
