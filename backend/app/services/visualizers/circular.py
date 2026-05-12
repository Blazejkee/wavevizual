"""Port of frontend/src/visualizers/circular.ts"""
from __future__ import annotations

import math
from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import (
    apply_glow, get_freq_bars, hex_to_rgba, hsl_to_rgb, lerp_rgba,
)


def draw_circular(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    bars    = get_freq_bars(audio, s.bar_count, t, s.sensitivity, s.bass_boost)
    cx      = W * (s.pos_x / 100)
    cy      = H * (s.pos_y / 100)
    rad     = min(W, H) * 0.22 * s.scale
    max_ext = rad * 0.75
    lw      = max(2, round(s.bar_width * 0.5))

    for i, mag in enumerate(bars):
        angle = (i / s.bar_count) * math.pi * 2 - math.pi / 2
        ext   = mag * max_ext
        cos_a, sin_a = math.cos(angle), math.sin(angle)

        x0 = cx + rad * cos_a
        y0 = cy + rad * sin_a
        x1 = cx + (rad + ext) * cos_a
        y1 = cy + (rad + ext) * sin_a

        if s.color_mode == "solid":
            color = hex_to_rgba(s.primary_color, s.opacity)
        elif s.color_mode == "rainbow":
            rc, gc, bc = hsl_to_rgb((i / s.bar_count) * 360, 0.9, 0.65)
            color = (rc, gc, bc, round(s.opacity * 255))
        else:
            color = lerp_rgba(s.primary_color, s.secondary_color, i / s.bar_count, s.opacity)

        draw.line([(x0, y0), (x1, y1)], fill=color, width=lw)

        if s.mirror:
            xm = cx + (rad - ext * 0.6) * cos_a
            ym = cy + (rad - ext * 0.6) * sin_a
            mir = hex_to_rgba(s.primary_color, s.opacity * 0.4)
            draw.line([(x0, y0), (xm, ym)], fill=mir, width=lw)

    # Inner ring
    ring_color = hex_to_rgba(s.primary_color, s.opacity * 0.25)
    r = round(rad)
    draw.ellipse(
        [round(cx - r), round(cy - r), round(cx + r), round(cy + r)],
        outline=ring_color, width=1,
    )

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
