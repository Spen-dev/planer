"""Generate Planer application icon."""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT_ICO = ROOT / "planner.ico"
OUT_PNG = ROOT / "planner.png"
OUT_ICNS = ROOT / "planner.icns"

BG_TOP = (58, 58, 66)
BG_BOTTOM = (34, 34, 40)
LETTER = (255, 255, 255)
ACCENT = (246, 201, 158)


def font_candidates() -> list[Path]:
    paths: list[Path] = []
    if sys.platform == "win32":
        paths.extend(Path("C:/Windows/Fonts") / name for name in (
            "segoeuib.ttf",
            "arialbd.ttf",
            "calibrib.ttf",
            "tahomabd.ttf",
        ))
    elif sys.platform == "darwin":
        paths.extend(Path("/System/Library/Fonts/Supplemental") / name for name in (
            "Arial Bold.ttf",
            "Arial.ttf",
            "Helvetica.ttc",
        ))
        paths.extend(Path("/Library/Fonts") / name for name in ("Arial Bold.ttf", "Arial.ttf"))
    else:
        paths.extend(
            Path("/usr/share/fonts/truetype/dejavu") / name
            for name in ("DejaVuSans-Bold.ttf", "DejaVuSans.ttf")
        )
    return paths


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in font_candidates():
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size)
            except OSError:
                continue
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


def save_ico(images: list[Image.Image], sizes: list[int]) -> None:
    images[-1].save(
        OUT_ICO,
        format="ICO",
        sizes=[(size, size) for size in sizes],
        append_images=images[:-1],
    )
    print(f"Created {OUT_ICO.name} ({len(sizes)} sizes)")


def save_png(image: Image.Image) -> None:
    image.save(OUT_PNG, format="PNG")
    print(f"Created {OUT_PNG.name}")


def save_icns(base_image: Image.Image) -> None:
    if sys.platform != "darwin":
        print("Skip planner.icns (build on macOS to create .icns)")
        return

    iconset = ROOT / "planner.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()

    mapping = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    seen: set[str] = set()
    for size, name in mapping:
        if name in seen:
            continue
        seen.add(name)
        draw_icon(size).save(iconset / name, format="PNG")

    result = subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(OUT_ICNS)],
        capture_output=True,
        text=True,
        check=False,
    )
    shutil.rmtree(iconset, ignore_errors=True)
    if result.returncode != 0:
        print(f"iconutil failed: {result.stderr.strip() or result.stdout.strip()}")
        return
    print(f"Created {OUT_ICNS.name}")


def main() -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [draw_icon(size) for size in sizes]
    save_ico(images, sizes)
    save_png(images[-1])
    save_icns(images[-1])


if __name__ == "__main__":
    main()
