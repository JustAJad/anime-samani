"""Build Windows icon and installer artwork from the exact supplied logo mark."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


root = Path(__file__).resolve().parents[1]
branding = root / "assets" / "branding"
installer = root / "assets" / "installer"
installer.mkdir(exist_ok=True)

mark = Image.open(branding / "mark.png").convert("RGBA")
mark_bbox = mark.getbbox()
if not mark_bbox:
    raise RuntimeError("The supplied logo mark is empty.")
mark = mark.crop(mark_bbox)


def fit(image, size):
    ratio = min(size[0] / image.width, size[1] / image.height)
    dimensions = (max(1, round(image.width * ratio)), max(1, round(image.height * ratio)))
    return image.resize(dimensions, Image.Resampling.LANCZOS)


def canvas(size):
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(size[1]):
        for x in range(size[0]):
            tone = (x / size[0] + y / size[1]) / 2
            pixels[x, y] = (int(17 + 15 * tone), int(14 + 6 * tone), int(23 + 7 * tone))
    return image


# Rebuild the standalone mark from the exact high-resolution user-authored mark.
# This avoids repeatedly enlarging the older raster icon and preserves smooth edges.
logo = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
clean_mark = fit(mark, (820, 820))
logo.alpha_composite(
    clean_mark,
    ((logo.width - clean_mark.width) // 2, (logo.height - clean_mark.height) // 2),
)
logo.save(branding / "app-mark.png", optimize=True)

# The Setup executable, installed app and shortcuts share this transparent icon.
# A restrained white-to-pink glow follows the exact supplied silhouette, so the
# pale edge remains readable without introducing a different dark tile variant.
windows_icon = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
icon_mark = fit(mark, (760, 760))
icon_position = (
    (windows_icon.width - icon_mark.width) // 2,
    (windows_icon.height - icon_mark.height) // 2,
)
icon_alpha = Image.new("L", windows_icon.size, 0)
icon_alpha.paste(icon_mark.getchannel("A"), icon_position)
glow_alpha = icon_alpha.filter(ImageFilter.GaussianBlur(12)).point(
    lambda alpha: round(alpha * 0.24)
)
glow = Image.new("RGBA", windows_icon.size)
glow_pixels = glow.load()
for y in range(glow.height):
    progress = y / (glow.height - 1)
    green = round(252 + (143 - 252) * progress)
    blue = round(252 + (157 - 252) * progress)
    for x in range(glow.width):
        glow_pixels[x, y] = (255, green, blue, 255)
glow.putalpha(glow_alpha)
windows_icon.alpha_composite(glow)
windows_icon.alpha_composite(
    icon_mark,
    icon_position,
)
windows_icon.save(branding / "app-icon-mark.png", optimize=True)
windows_icon.save(root / "icon.png", optimize=True)
windows_icon.save(
    root / "icon.ico",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)

version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
major_version = version.split(".", 1)[0]
font_path = root / "assets" / "fonts" / "Beckman-FREE.otf"
scale = 4

# Render installer bitmaps at 4x, then reduce once. That final LANCZOS pass gives
# the logo, type, and gradients a clean antialiased finish at NSIS dimensions.
header = canvas((150 * scale, 57 * scale)).convert("RGBA")
draw = ImageDraw.Draw(header)
header_mark = fit(mark, (49 * scale, 49 * scale))
anime_font = ImageFont.truetype(str(font_path), 10 * scale)
samani_font = ImageFont.truetype(str(font_path), 14 * scale)
anime_box = draw.textbbox((0, 0), "ANIME", font=anime_font)
samani_box = draw.textbbox((0, 0), "SAMANI", font=samani_font)
word_width = max(anime_box[2] - anime_box[0], samani_box[2] - samani_box[0])
group_width = header_mark.width + 6 * scale + word_width
group_x = (header.width - group_width) // 2
word_x = group_x + header_mark.width + 6 * scale
header.alpha_composite(header_mark, (group_x, 4 * scale))
draw.text(
    (word_x, 11 * scale),
    "ANIME",
    font=anime_font,
    fill="#fff5ef",
)
draw.text(
    (word_x, 26 * scale),
    "SAMANI",
    font=samani_font,
    fill="#ffb5b9",
)
header.resize((150, 57), Image.Resampling.LANCZOS).convert("RGB").save(
    installer / "header.bmp"
)

sidebar = canvas((164 * scale, 314 * scale)).convert("RGBA")
draw = ImageDraw.Draw(sidebar)
side_mark = fit(mark, (146 * scale, 146 * scale))
sidebar.alpha_composite(side_mark, ((164 * scale - side_mark.width) // 2, 42 * scale))
for text, y, size, color in [
    ("ANIME", 205, 17, "#fff5ef"),
    ("SAMANI", 230, 24, "#ffb5b9"),
    (f"V{major_version}", 284, 12, "#c7bfc9"),
]:
    font = ImageFont.truetype(str(font_path), size * scale)
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((164 * scale - (box[2] - box[0])) / 2, y * scale), text, font=font, fill=color)
sidebar.resize((164, 314), Image.Resampling.LANCZOS).convert("RGB").save(
    installer / "sidebar.bmp"
)

print("Generated antialiased Windows icon and NSIS artwork from mark.png")
