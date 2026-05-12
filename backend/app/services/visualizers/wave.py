"""Port of frontend/src/visualizers/wave.ts"""
from __future__ import annotations

from typing import Optional

import numpy as np
from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import (
    apply_glow, get_wave_samples, hex_to_rgba, lerp_rgba, _grad_h,
)


def draw_wave(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    samples = get_wave_samples(audio, 512, t)
    n       = len(samples)
    cx      = W * (s.pos_x / 100)
    cy      = H * (s.pos_y / 100)
    wave_w  = W * 0.9 * s.scale
    wave_h  = H * 0.30 * s.scale
    start_x = cx - wave_w / 2

    pts = []
    for i in range(n):
        x   = start_x + (i / (n - 1)) * wave_w
        raw = samples[i] * s.sensitivity
        y   = cy + raw * wave_h * 0.45
        pts.append((x, y))

    # Stroke — gradient drawn segment by segment
    a = round(s.opacity * 255)
    if s.color_mode == "gradient":
        for i in range(len(pts) - 1):
            frac = i / (n - 1)
            color = lerp_rgba(s.primary_color, s.secondary_color, frac, s.opacity)
            draw.line([pts[i], pts[i + 1]], fill=color, width=3)
    else:
        color = hex_to_rgba(s.primary_color, s.opacity)
        draw.line(pts, fill=color, width=3)

    if s.mirror:
        mir_pts = [(x, cy - (y - cy)) for x, y in pts]
        mir_col = hex_to_rgba(s.primary_color, s.opacity * 0.45)
        draw.line(mir_pts, fill=mir_col, width=2)

    # Filled area below the wave
    poly = [(start_x, cy)] + pts + [(start_x + wave_w, cy)]
    fill_col = hex_to_rgba(s.primary_color, s.opacity * 0.15)
    draw.polygon(poly, fill=fill_col)

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
