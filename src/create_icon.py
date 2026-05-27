"""Generate Planer application icon."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "planner.ico"

BG_TOP = (58, 58, 66)
BG_BOTTOM = (34, 34, 40)
LETTER = (255, 255, 255)
ACCENT = (246, 201, 158)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("segoeuib.ttf", "arialbd.ttf", "calibrib.ttf", "tahomabd.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def draw_icon(size: int) -> Image.Image:
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    radius = max(size // 5, 4)

    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / max(size - 1, 1)
        color = (
            lerp(BG_TOP[0], BG_BOTTOM[0], t),
            lerp(BG_TOP[1], BG_BOTTOM[1], t),
            lerp(BG_TOP[2], BG_BOTTOM[2], t),
            255,
        )
        bg_draw.line([(0, y), (size, y)], fill=color)

    mask = rounded_mask(size, radius)
    icon.paste(bg, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    accent_h = max(2, size // 16)
    draw.rounded_rectangle(
        (size * 0.18, size - accent_h - size * 0.14, size * 0.82, size - size * 0.14),
        radius=max(1, accent_h // 2),
        fill=ACCENT,
    )

    font_size = max(8, int(size * 0.62))
    font = load_font(font_size)
    letter = "П"
    bbox = draw.textbbox((0, 0), letter, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1] - size * 0.04
    draw.text((x, y), letter, font=font, fill=LETTER)

    return icon


def main() -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [draw_icon(size) for size in sizes]
    # Pillow skips sizes larger than the base image — save from 256×256.
    images[-1].save(
        OUT,
        format="ICO",
        sizes=[(size, size) for size in sizes],
        append_images=images[:-1],
    )
    print(f"Created {OUT.name} ({len(sizes)} sizes)")


if __name__ == "__main__":
    main()
