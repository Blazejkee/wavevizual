"""Port of frontend/src/visualizers/dual.ts"""
from __future__ import annotations

import math
from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import (
    apply_glow, get_freq_bars_ch, hex_to_rgba, hsl_to_rgb,
    lerp_colors, paste_grad_bar,
)


def draw_dual(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,
) -> Image.Image:
    import numpy as np
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    n    = s.bar_count // 2
    cx   = W * (s.pos_x / 100)
    cy   = H * (s.pos_y / 100)
    max_h = H * 0.4 * s.scale

    half_gw = W * s.scale * 0.48
    slot_w  = half_gw / n
    fill_r  = s.bar_width / (s.bar_width + max(0.01, s.bar_gap))
    act_bw  = max(1.0, slot_w * fill_r)
    div_gap = max(4.0, slot_w * 0.5)
    radius  = s.roundness

    sens = s.sensitivity * (1 + s.bass_boost * 0.15)

    if audio and len(audio.freq_l) > 0:
        bars_l = get_freq_bars_ch(audio.freq_l, n, sens)
        bars_r = get_freq_bars_ch(audio.freq_r, n, sens)
    else:
        import numpy as _np
        x = _np.arange(n, dtype=_np.float32) / n
        import math as _m
        bars_l = _np.clip(
            _np.abs(_np.sin(t * 1.8 + x * 0.4)) * _np.exp(-x * 2.5) * 0.9 + 0.05,
            0, 1,
        ).astype(_np.float32)
        bars_r = _np.clip(
            _np.abs(_np.sin(t * 1.8 + (1 - x) * 0.4 + 0.3)) * _np.exp(-(1 - x) * 2.5) * 0.9 + 0.05,
            0, 1,
        ).astype(_np.float32)

    def _draw_bar(x0, y0, x1, y1, primary, secondary, is_left):
        if x1 <= x0 or y1 <= y0:
            return
        if s.color_mode == "solid":
            color = hex_to_rgba(primary, s.opacity)
            r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
            if r > 0:
                draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
            else:
                draw.rectangle([x0, y0, x1, y1], fill=color)
        elif s.color_mode == "rainbow":
            idx = i if not is_left else (n - 1 - i)
            h_deg = (idx / n) * 120 + (180 if is_left else 60)
            from app.services.visualizers.types import hsl_to_rgb as _hsl
            rc, gc, bc = _hsl(h_deg, 0.9, 0.65)
            color = (rc, gc, bc, round(s.opacity * 255))
            r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
            if r > 0:
                draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
            else:
                draw.rectangle([x0, y0, x1, y1], fill=color)
        else:
            bar_h = y1 - y0
            t_top = min(1.0, bar_h / max_h) if max_h > 0 else 0.0
            c_top = lerp_colors(secondary, primary, t_top)
            c_top_hex = "#{:02x}{:02x}{:02x}".format(*c_top)
            paste_grad_bar(layer, x0, y0, x1, y1, c_top_hex, secondary, s.opacity, radius)

    for i in range(n):
        # Left channel — bars extend left from centre
        bar_h = max(2.0, bars_l[n - 1 - i] * max_h)
        x     = cx - div_gap / 2 - (i + 1) * slot_w + (slot_w - act_bw) / 2
        x0, y0 = round(x), round(cy - bar_h / 2)
        x1, y1 = round(x + act_bw), round(cy + bar_h / 2)
        _draw_bar(x0, y0, x1, y1, s.primary_color, s.secondary_color, True)

        # Right channel — bars extend right from centre
        bar_h = max(2.0, bars_r[i] * max_h)
        x     = cx + div_gap / 2 + i * slot_w + (slot_w - act_bw) / 2
        x0, y0 = round(x), round(cy - bar_h / 2)
        x1, y1 = round(x + act_bw), round(cy + bar_h / 2)
        _draw_bar(x0, y0, x1, y1, s.secondary_color, s.primary_color, False)

    # Centre divider
    div_col = hex_to_rgba(s.primary_color, s.opacity * 0.2)
    draw.line([(round(cx), round(cy - max_h)), (round(cx), round(cy + max_h))],
              fill=div_col, width=1)

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
