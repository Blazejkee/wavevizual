"""Port of frontend/src/visualizers/bars.ts"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw

from app.services.audio_analyzer import AudioFrame
from app.services.visualizers.types import (
    apply_glow, get_freq_bars, hex_to_rgba, hsl_to_rgb,
    lerp_colors, paste_grad_bar,
)


def draw_bars(
    W: int, H: int, t: float,
    audio: Optional[AudioFrame],
    s,          # RenderSettings
) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    bars      = get_freq_bars(audio, s.bar_count, t, s.sensitivity, s.bass_boost)
    group_w   = min(W * 0.99, W * s.scale)
    slot_w    = group_w / s.bar_count
    fill_r    = s.bar_width / (s.bar_width + max(0.01, s.bar_gap))
    actual_bw = max(1.0, slot_w * fill_r)
    cx        = W * (s.pos_x / 100)
    max_h     = H * 0.45 * s.scale
    start_x   = cx - group_w / 2
    base_y    = H * (s.pos_y / 100)
    radius    = s.roundness

    for i, mag in enumerate(bars):
        bar_h = max(2.0, mag * max_h)
        x     = start_x + i * slot_w + (slot_w - actual_bw) / 2
        x0, y0 = round(x), round(base_y - bar_h)
        x1, y1 = round(x + actual_bw), round(base_y)
        if x1 <= x0:
            continue

        if s.color_mode == "solid":
            color = hex_to_rgba(s.primary_color, s.opacity)
            r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
            if r > 0:
                draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
            else:
                draw.rectangle([x0, y0, x1, y1], fill=color)

        elif s.color_mode == "rainbow":
            rc, gc, bc = hsl_to_rgb((i / s.bar_count) * 360, 0.9, 0.65)
            color = (rc, gc, bc, round(s.opacity * 255))
            r = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)
            if r > 0:
                draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
            else:
                draw.rectangle([x0, y0, x1, y1], fill=color)

        else:  # gradient
            # Canvas: makeGradient(0, baseY, 0, baseY-maxH, secondaryColor, primaryColor)
            # → bottom=secondary, top=primary; bar shows partial slice
            t_top = min(1.0, bar_h / max_h) if max_h > 0 else 0.0
            c_top = lerp_colors(s.secondary_color, s.primary_color, t_top)
            c_top_hex = "#{:02x}{:02x}{:02x}".format(*c_top)
            paste_grad_bar(layer, x0, y0, x1, y1, c_top_hex, s.secondary_color, s.opacity, radius)

        # Mirror (faint reflection below base_y)
        if s.mirror:
            my0, my1 = round(base_y), round(base_y + bar_h)
            if my1 > my0:
                mir_color = hex_to_rgba(s.primary_color, s.opacity * 0.45)
                r = min(radius, (x1 - x0) // 2, (my1 - my0) // 2)
                if r > 0:
                    draw.rounded_rectangle([x0, my0, x1, my1], radius=r, fill=mir_color)
                else:
                    draw.rectangle([x0, my0, x1, my1], fill=mir_color)

    if s.glow > 0:
        layer = apply_glow(layer, s.glow)

    return layer
