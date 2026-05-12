"""Port of frontend/src/visualizers/neon.ts"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import apply_glow, get_wave_samples, hex_to_rgba


_LAYERS = [
    {"offset": 0.00, "col_frac": 0.0, "blur": 1.0, "alpha": 1.0,  "width": 3},
    {"offset": 0.08, "col_frac": 0.4, "blur": 0.7, "alpha": 0.5,  "width": 2},
    {"offset":-0.10, "col_frac": 0.7, "blur": 0.5, "alpha": 0.35, "width": 2},
    {"offset": 0.18, "col_frac": 1.0, "blur": 0.3, "alpha": 0.2,  "width": 1},
]


def draw_neon(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    cx      = W * (s.pos_x / 100)
    cy      = H * (s.pos_y / 100)
    wave_w  = W * 0.88 * s.scale
    wave_h  = H * 0.28 * s.scale
    start_x = cx - wave_w / 2

    def _hex(r, g, b):
        return "#{:02x}{:02x}{:02x}".format(r, g, b)

    def _lerp_ch(a, b, t):
        return round(a + (b - a) * t)

    r1, g1, b1 = int(s.primary_color[1:3], 16), int(s.primary_color[3:5], 16), int(s.primary_color[5:7], 16)
    r2, g2, b2 = int(s.secondary_color[1:3], 16), int(s.secondary_color[3:5], 16), int(s.secondary_color[5:7], 16)

    for ldef in _LAYERS:
        samples  = get_wave_samples(audio, 400, t + ldef["offset"] * 2)
        n        = len(samples)
        cf       = ldef["col_frac"]
        rc       = _lerp_ch(r1, r2, cf)
        gc       = _lerp_ch(g1, g2, cf)
        bc       = _lerp_ch(b1, b2, cf)
        alpha_a  = ldef["alpha"] * s.opacity
        color    = (rc, gc, bc, min(255, round(alpha_a * 255)))
        width    = ldef["width"]

        pts = []
        for i in range(n):
            x   = start_x + (i / (n - 1)) * wave_w
            raw = samples[i] * s.sensitivity + ldef["offset"] * 0.3
            y   = cy + raw * wave_h * 0.45
            pts.append((x, y))

        draw.line(pts, fill=color, width=width)

        if s.mirror:
            mir_pts = [(x, cy - (y - cy)) for x, y in pts]
            mir_col = (rc, gc, bc, min(255, round(alpha_a * 0.4 * 255)))
            draw.line(mir_pts, fill=mir_col, width=width)

    # Centre spine (dashed approximation with short segments)
    spine_col = hex_to_rgba(s.primary_color, s.opacity * 0.15)
    dash_on, dash_off = 4, 8
    x = start_x
    while x < start_x + wave_w:
        x1 = min(x + dash_on, start_x + wave_w)
        draw.line([(x, cy), (x1, cy)], fill=spine_col, width=1)
        x += dash_on + dash_off

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
