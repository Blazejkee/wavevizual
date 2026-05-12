"""Port of frontend/src/visualizers/album.ts"""
from __future__ import annotations

import math
from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import (
    apply_glow, get_freq_bars, hex_to_rgba, hsl_to_rgb, lerp_rgba,
)


def draw_album(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
    cover_img: Optional[Image.Image] = None,
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    cx   = W * (s.pos_x / 100)
    cy   = H * (s.pos_y / 100)
    base = min(W, H)
    rad  = base * 0.18 * s.scale
    bars = get_freq_bars(audio, s.bar_count, t, s.sensitivity, s.bass_boost)
    lw   = max(2, round(s.bar_width * 0.4))

    outer_rad = rad * 1.65

    # Circular frequency bars (rotating slowly)
    for i, mag in enumerate(bars):
        angle = (i / s.bar_count) * math.pi * 2 - math.pi / 2 + t * 0.15
        ext   = mag * rad * 0.8 + 3
        cos_a, sin_a = math.cos(angle), math.sin(angle)

        x0 = cx + outer_rad * cos_a
        y0 = cy + outer_rad * sin_a
        x1 = cx + (outer_rad + ext) * cos_a
        y1 = cy + (outer_rad + ext) * sin_a

        if s.color_mode == "solid":
            color = hex_to_rgba(s.primary_color, s.opacity)
        elif s.color_mode == "rainbow":
            rc, gc, bc = hsl_to_rgb((i / s.bar_count) * 360, 0.9, 0.65)
            color = (rc, gc, bc, round(s.opacity * 255))
        else:
            color = lerp_rgba(s.primary_color, s.secondary_color, i / s.bar_count, s.opacity)

        draw.line([(x0, y0), (x1, y1)], fill=color, width=lw)

    # Glow ring behind album art (radial gradient approximation)
    for step in range(15, -1, -1):
        frac = step / 15
        rr   = round(rad * (0.9 + frac * 0.5))
        a_v  = round(s.opacity * 0.35 * (1 - frac) * 255)
        if a_v <= 0:
            continue
        r_, g_, b_ = int(s.primary_color[1:3], 16), int(s.primary_color[3:5], 16), int(s.primary_color[5:7], 16)
        draw.ellipse([round(cx - rr), round(cy - rr),
                       round(cx + rr), round(cy + rr)],
                      fill=(r_, g_, b_, a_v))

    # Album art (circular clip)
    art_r = round(rad)
    art_box = [round(cx - art_r), round(cy - art_r),
               round(cx + art_r), round(cy + art_r)]

    if cover_img:
        # Resize cover to fit circle bounding box
        size = art_r * 2
        thumb = cover_img.resize((size, size), Image.LANCZOS).convert("RGBA")
        # Circular mask
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        thumb.putalpha(mask)
        layer.paste(thumb, (round(cx - art_r), round(cy - art_r)), thumb)
    else:
        # Placeholder
        r_, g_, b_ = int(s.primary_color[1:3], 16), int(s.primary_color[3:5], 16), int(s.primary_color[5:7], 16)
        fill_col = (round(r_ * 0.15), round(g_ * 0.15), round(b_ * 0.15), 255)
        mask = Image.new("L", (art_r * 2, art_r * 2), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, art_r * 2 - 1, art_r * 2 - 1], fill=255)
        circle = Image.new("RGBA", (art_r * 2, art_r * 2), fill_col)
        circle.putalpha(mask)
        layer.paste(circle, (round(cx - art_r), round(cy - art_r)), circle)

    # Border ring
    border_col = hex_to_rgba(s.primary_color, s.opacity * 0.5)
    draw.ellipse(art_box, outline=border_col, width=2)

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
