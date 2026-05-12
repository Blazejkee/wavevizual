"""
Shared drawing utilities — Python port of frontend/src/visualizers/types.ts.
All draw functions write onto a transparent RGBA PIL Image layer.
"""
from __future__ import annotations

import colorsys
import math
from typing import Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from app.services.audio_analyzer import AudioFrame

RGBA = Tuple[int, int, int, int]
RGB  = Tuple[int, int, int]


# ── Colour helpers ────────────────────────────────────────────────────────────

def hex_to_rgb(c: str) -> RGB:
    h = c.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def hex_to_rgba(c: str, opacity: float) -> RGBA:
    r, g, b = hex_to_rgb(c)
    return (r, g, b, min(255, max(0, round(opacity * 255))))


def lerp_colors(c1: str, c2: str, t: float) -> RGB:
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    t = max(0.0, min(1.0, t))
    return (round(r1 + (r2 - r1) * t), round(g1 + (g2 - g1) * t), round(b1 + (b2 - b1) * t))


def lerp_rgba(c1: str, c2: str, t: float, opacity: float) -> RGBA:
    r, g, b = lerp_colors(c1, c2, t)
    return (r, g, b, min(255, round(opacity * 255)))


def hsl_to_rgb(h_deg: float, s: float, l: float) -> RGB:
    r, g, b = colorsys.hls_to_rgb(h_deg / 360.0, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


# ── Gradient arrays ───────────────────────────────────────────────────────────

def _grad_v(h: int, c_top: str, c_bot: str, opacity: float) -> np.ndarray:
    """Vertical RGBA gradient array [H, 4]."""
    if h <= 0:
        return np.zeros((0, 4), dtype=np.uint8)
    r1, g1, b1 = hex_to_rgb(c_top)
    r2, g2, b2 = hex_to_rgb(c_bot)
    a = min(255, max(0, round(opacity * 255)))
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)
    out = np.empty((h, 4), dtype=np.uint8)
    out[:, 0] = np.clip(r1 + (r2 - r1) * t, 0, 255).astype(np.uint8)
    out[:, 1] = np.clip(g1 + (g2 - g1) * t, 0, 255).astype(np.uint8)
    out[:, 2] = np.clip(b1 + (b2 - b1) * t, 0, 255).astype(np.uint8)
    out[:, 3] = a
    return out


def _grad_h(w: int, c_l: str, c_r: str, opacity: float) -> np.ndarray:
    """Horizontal RGBA gradient array [W, 4]."""
    if w <= 0:
        return np.zeros((0, 4), dtype=np.uint8)
    r1, g1, b1 = hex_to_rgb(c_l)
    r2, g2, b2 = hex_to_rgb(c_r)
    a = min(255, max(0, round(opacity * 255)))
    t = np.linspace(0.0, 1.0, w, dtype=np.float32)
    out = np.empty((w, 4), dtype=np.uint8)
    out[:, 0] = np.clip(r1 + (r2 - r1) * t, 0, 255).astype(np.uint8)
    out[:, 1] = np.clip(g1 + (g2 - g1) * t, 0, 255).astype(np.uint8)
    out[:, 2] = np.clip(b1 + (b2 - b1) * t, 0, 255).astype(np.uint8)
    out[:, 3] = a
    return out


# ── Glow (Gaussian blur + screen blend, bounded to content bbox) ──────────────

def apply_glow(layer: Image.Image, glow_px: float) -> Image.Image:
    if glow_px <= 0:
        return layer
    bbox = layer.getbbox()
    if bbox is None:
        return layer

    sigma = max(1.0, glow_px / 2.5)
    pad   = round(sigma * 3) + 4
    W, H  = layer.size
    bx0   = max(0, bbox[0] - pad)
    by0   = max(0, bbox[1] - pad)
    bx1   = min(W, bbox[2] + pad)
    by1   = min(H, bbox[3] + pad)
    if bx1 <= bx0 or by1 <= by0:
        return layer

    crop    = layer.crop((bx0, by0, bx1, by1))
    blurred = crop.filter(ImageFilter.GaussianBlur(radius=sigma))
    a = np.asarray(crop,    dtype=np.float32) / 255.0
    b = np.asarray(blurred, dtype=np.float32) / 255.0
    glowed = Image.fromarray(
        (np.clip(1.0 - (1.0 - a) * (1.0 - b), 0.0, 1.0) * 255).astype(np.uint8),
        "RGBA",
    )
    result = layer.copy()
    result.paste(glowed, (bx0, by0), glowed)
    return result


# ── Gradient bar ──────────────────────────────────────────────────────────────

def paste_grad_bar(
    layer: Image.Image,
    x0: int, y0: int, x1: int, y1: int,
    c_top: str, c_bot: str, opacity: float,
    radius: int = 0,
) -> None:
    """Paste a vertically-gradient rounded rectangle onto layer."""
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return
    grad  = _grad_v(h, c_top, c_bot, opacity)
    strip = np.tile(grad[:, np.newaxis, :], (1, w, 1))
    img   = Image.fromarray(strip, "RGBA")
    if radius > 0:
        r    = min(radius, w // 2, h // 2)
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=r, fill=255)
        arr     = np.array(img)
        arr[:, :, 3] = (arr[:, :, 3].astype(np.float32) * np.array(mask) / 255).astype(np.uint8)
        img = Image.fromarray(arr, "RGBA")
    layer.paste(img, (x0, y0), img)


# ── Audio helpers (ports of types.ts) ────────────────────────────────────────

def get_freq_bars(
    audio: Optional[AudioFrame],
    n: int, t: float,
    sensitivity: float, bass_boost: float,
) -> np.ndarray:
    if audio is None:
        x = np.arange(n, dtype=np.float32) / n
        bass = np.abs(np.sin(t * 1.8 + x * 0.4)) * np.exp(-x * 2.5)
        mid  = np.abs(np.sin(t * 2.4 + x * 2.0)) * np.exp(-x * 1.2) * 0.5
        hi   = np.abs(np.sin(t * 4.0 + x * 5.0)) * 0.2
        return np.clip((bass + mid + hi) * 0.85 + 0.08, 0.0, 1.0).astype(np.float32)

    src  = audio.freq
    slen = len(src)
    out  = np.empty(n, dtype=np.float32)
    for i in range(n):
        idx   = min(int((i / n) * slen * 0.8), slen - 1)
        raw   = src[idx] / 255.0
        boost = bass_boost if i < n * 0.15 else 1.0
        out[i] = min(1.0, raw * sensitivity * boost)
    return out


def get_freq_bars_ch(data: np.ndarray, n: int, sensitivity: float) -> np.ndarray:
    dlen = len(data)
    out  = np.empty(n, dtype=np.float32)
    for i in range(n):
        idx   = min(int((i / n) * dlen * 0.8), dlen - 1)
        out[i] = min(1.0, (data[idx] / 255.0) * sensitivity)
    return out


def get_wave_samples(audio: Optional[AudioFrame], n: int, t: float) -> np.ndarray:
    if audio is None:
        x = np.arange(n, dtype=np.float32) / n
        return (
            0.38 * np.sin(x * math.pi * 4  + t * 2.0) +
            0.28 * np.sin(x * math.pi * 10 + t * 3.5) +
            0.14 * np.sin(x * math.pi * 20 + t * 1.2) +
            0.20 * np.sin(x * math.pi * 2  + t * 0.8)
        ).astype(np.float32)

    src  = audio.wave
    slen = len(src)
    out  = np.empty(n, dtype=np.float32)
    for i in range(n):
        idx   = min(int((i / n) * slen), slen - 1)
        out[i] = (src[idx] - 128.0) / 128.0
    return out
