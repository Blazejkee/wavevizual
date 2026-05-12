"""Port of frontend/src/visualizers/radial.ts"""
from __future__ import annotations

import math
from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import apply_glow, hex_to_rgba, lerp_colors, _grad_v


def draw_radial(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
) -> Image.Image:
    import numpy as np
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    cx = W * (s.pos_x / 100)
    cy = H * (s.pos_y / 100)

    if audio:
        bass  = min(1.0, audio.bass  * s.sensitivity * (1 + s.bass_boost * 0.3))
        mids  = min(1.0, audio.mids  * s.sensitivity)
        highs = min(1.0, audio.highs * s.sensitivity)
    else:
        bass  = 0.5 + 0.4 * math.sin(t * 2.2)
        mids  = 0.4 + 0.3 * math.sin(t * 3.1)
        highs = 0.3 + 0.2 * math.sin(t * 5.0)

    pulse = min(0.5, bass) if s.reduce_flashing else bass

    # Outer pulse rings (3 → 0, drawn outer-first)
    for ring in range(3, -1, -1):
        ring_scale = 0.6 + ring * 0.35
        r     = min(W, H) * 0.12 * s.scale * ring_scale * (1 + pulse * 0.45)
        alpha = (0.8 - ring * 0.18) * s.opacity
        blur  = s.glow * (1 - ring * 0.2)

        color_hex = s.primary_color if ring % 2 == 0 else s.secondary_color

        if ring == 0:
            # Radial gradient fill — approximate with concentric filled ellipses
            steps = 10
            for step in range(steps, -1, -1):
                frac   = step / steps
                rr     = round(r * frac)
                t_lerp = 1 - frac
                c_mid  = lerp_colors(s.primary_color, s.secondary_color, t_lerp)
                a_val  = round(alpha * (1 - frac * 0.5) * 255)
                fill   = (*c_mid, a_val)
                draw.ellipse([round(cx - rr), round(cy - rr),
                               round(cx + rr), round(cy + rr)], fill=fill)
        else:
            out_col = hex_to_rgba(color_hex, alpha * 0.7)
            lw = max(1, round(3 - ring * 0.5))
            draw.ellipse([round(cx - r), round(cy - r),
                           round(cx + r), round(cy + r)],
                          outline=out_col, width=lw)

    # Mid-frequency orbiting particles
    orbit_r = min(W, H) * 0.12 * s.scale * (1.8 + mids * 0.8)
    for i in range(12):
        angle = (i / 12) * math.pi * 2 + t * 0.8
        px    = cx + math.cos(angle) * orbit_r
        py    = cy + math.sin(angle) * orbit_r
        pr    = round(2 + highs * 4)
        pcol  = hex_to_rgba(s.secondary_color, s.opacity * 0.8)
        draw.ellipse([round(px - pr), round(py - pr),
                       round(px + pr), round(py + pr)], fill=pcol)

    # High-freq outer sparks
    if not s.reduce_flashing and highs > 0.4:
        inner_r = min(W, H) * 0.15 * s.scale * (1 + pulse * 0.5)
        outer_r = inner_r + highs * min(W, H) * 0.08 * s.scale
        spark_col = hex_to_rgba(s.primary_color, s.opacity * highs * 0.6)
        for i in range(20):
            angle = (i / 20) * math.pi * 2 + t * 2.5
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            draw.line(
                [(round(cx + cos_a * inner_r), round(cy + sin_a * inner_r)),
                 (round(cx + cos_a * outer_r), round(cy + sin_a * outer_r))],
                fill=spark_col, width=1,
            )

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
