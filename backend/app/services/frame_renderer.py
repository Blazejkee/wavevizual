"""
Frame-by-frame Python renderer.

Pipeline:
  1. Analyze audio (FFT per frame, matching Web Audio API)
  2. Render frames in parallel using ProcessPoolExecutor (bypasses GIL)
  3. Pipe ordered RGB bytes to FFmpeg for H.264 encoding
"""
from __future__ import annotations

import logging
import math
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from app.config import FFMPEG_PATH, OUTPUT_FPS, QUALITY_PRESETS
from app.models import JobStatus, job_store
from app.services.audio_analyzer import AudioFrame, analyze_audio
from app.services.ffmpeg import get_audio_duration, get_resolution
from app.services.storage import ensure_output_dir, output_path
from app.services.visualizers.album    import draw_album
from app.services.visualizers.bars     import draw_bars
from app.services.visualizers.circular import draw_circular
from app.services.visualizers.dual     import draw_dual
from app.services.visualizers.neon     import draw_neon
from app.services.visualizers.radial   import draw_radial
from app.services.visualizers.wave     import draw_wave

log = logging.getLogger(__name__)

DRAW_MAP = {
    "bars":     draw_bars,
    "wave":     draw_wave,
    "circular": draw_circular,
    "dual":     draw_dual,
    "neon":     draw_neon,
    "radial":   draw_radial,
    "album":    draw_album,
}

# Leave 2 cores for FFmpeg + OS; use the rest for parallel frame rendering
_RENDER_WORKERS = max(1, (os.cpu_count() or 4) - 2)
# Frames buffered in memory at once (each 1080p RGB frame ≈ 6 MB)
_BATCH_SIZE = _RENDER_WORKERS * 4


# ── Background ────────────────────────────────────────────────────────────────

def _object_cover(img: Image.Image, W: int, H: int) -> Image.Image:
    iw, ih = img.size
    s  = max(W / iw, H / ih)
    nw = round(iw * s)
    nh = round(ih * s)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - W) // 2
    top  = (nh - H) // 2
    return img.crop((left, top, left + W, top + H))


def _make_default_bg(W: int, H: int) -> Image.Image:
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    t   = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    arr[:, :, 0] = (8  + (13  - 8)  * t).astype(np.uint8)
    arr[:, :, 1] = (8  + (13  - 8)  * t).astype(np.uint8)
    arr[:, :, 2] = (18 + (32  - 18) * t).astype(np.uint8)
    arr[:, :, 3] = 255
    return Image.fromarray(arr, "RGBA")


def _render_bg(
    bg_large: Optional[Image.Image],
    default_bg: Image.Image,
    t: float,
    audio: Optional[AudioFrame],
    s, W: int, H: int,
) -> Image.Image:
    if bg_large is None:
        return default_bg.copy()

    bw, bh = bg_large.size
    if s.bg_effect == "slow-zoom":
        zoom = 1.0 + (t * 0.002) % 0.15
    elif s.bg_effect == "pulse" and audio:
        zoom = 1.0 + audio.bass * 0.06
    else:
        zoom = 1.0

    scale  = bw / W
    crop_w = round(W / zoom)
    crop_h = round(H / zoom)
    cw     = min(round(crop_w * scale), bw)
    ch     = min(round(crop_h * scale), bh)
    left   = (bw - cw) // 2
    top    = (bh - ch) // 2
    frame  = bg_large.crop((left, top, left + cw, top + ch)).resize((W, H), Image.BILINEAR)

    if s.bg_blur > 0:
        frame = frame.filter(ImageFilter.GaussianBlur(radius=s.bg_blur))

    return frame.convert("RGBA")


def _vignette(W: int, H: int) -> Image.Image:
    cx, cy  = W / 2, H / 2
    max_d   = math.hypot(cx, cy)
    ys, xs  = np.mgrid[0:H, 0:W]
    d       = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    t       = np.clip((d - max_d * 0.2) / (max_d * 0.65), 0, 1)
    alpha   = (t ** 1.5 * 0.65 * 255).astype(np.uint8)
    vig     = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vig.putalpha(Image.fromarray(alpha))
    return vig


def _render_text(s, W: int, H: int) -> Image.Image:
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)
    title_sz  = max(36, H // 18)
    artist_sz = max(28, H // 26)
    for path in [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        try:
            font_title  = ImageFont.truetype(path, title_sz)
            font_artist = ImageFont.truetype(path, artist_sz)
            break
        except Exception:
            font_title  = ImageFont.load_default()
            font_artist = ImageFont.load_default()

    if s.song_title:
        bbox = draw.textbbox((0, 0), s.song_title, font=font_title)
        x, y = (W - (bbox[2] - bbox[0])) // 2, 50
        draw.text((x + 2, y + 2), s.song_title, font=font_title, fill=(0, 0, 0, 200))
        draw.text((x, y),         s.song_title, font=font_title, fill=(255, 255, 255, 255))

    if s.artist_name:
        bbox = draw.textbbox((0, 0), s.artist_name, font=font_artist)
        x, y = (W - (bbox[2] - bbox[0])) // 2, 50 + title_sz + 12
        draw.text((x + 2, y + 2), s.artist_name, font=font_artist, fill=(0, 0, 0, 180))
        draw.text((x, y),         s.artist_name, font=font_artist, fill=(255, 255, 255, 200))

    return layer


# ── Per-frame render ──────────────────────────────────────────────────────────

def _render_frame(
    bg_large:   Optional[Image.Image],
    default_bg: Image.Image,
    cover_img:  Optional[Image.Image],
    vignette:   Image.Image,
    text_layer: Image.Image,
    audio:      Optional[AudioFrame],
    t: float,
    s, W: int, H: int,
) -> Image.Image:
    frame = _render_bg(bg_large, default_bg, t, audio, s, W, H)

    if s.bg_darken > 0:
        frame = Image.alpha_composite(
            frame,
            Image.new("RGBA", (W, H), (0, 0, 0, round(s.bg_darken * 255))),
        )

    if s.bg_vignette:
        frame = Image.alpha_composite(frame, vignette)

    fn = DRAW_MAP.get(s.template, draw_bars)
    viz_layer = fn(W, H, t, audio, s, cover_img) if s.template == "album" else fn(W, H, t, audio, s)
    frame = Image.alpha_composite(frame, viz_layer)

    if s.show_text_overlay and (s.song_title or s.artist_name):
        frame = Image.alpha_composite(frame, text_layer)

    return frame


# ── Parallel worker (module-level so ProcessPoolExecutor can pickle it) ───────

_W: dict = {}  # per-worker image cache, set by initializer


def _worker_init(
    bg_b: Optional[bytes], bg_sz: Optional[tuple],
    def_b: bytes,           def_sz: tuple,
    cov_b: Optional[bytes], cov_sz: Optional[tuple],
    vig_b: bytes,           vig_sz: tuple,
    txt_b: bytes,           txt_sz: tuple,
) -> None:
    _W['bg']   = Image.frombytes('RGBA', bg_sz,  bg_b)  if bg_b  else None
    _W['def']  = Image.frombytes('RGBA', def_sz, def_b)
    _W['cov']  = Image.frombytes('RGBA', cov_sz, cov_b) if cov_b else None
    _W['vig']  = Image.frombytes('RGBA', vig_sz, vig_b)
    _W['txt']  = Image.frombytes('RGBA', txt_sz, txt_b)


def _worker_render(args: tuple) -> bytes:
    _fi, t, audio, s, W, H = args
    frame = _render_frame(_W['bg'], _W['def'], _W['cov'], _W['vig'], _W['txt'], audio, t, s, W, H)
    return frame.convert("RGB").tobytes()


# ── Main entry point ──────────────────────────────────────────────────────────

def render_job_frames(job_id: str) -> None:
    import time as _time

    job = job_store.get(job_id)
    if job is None:
        log.error("render_job_frames: job %s not found", job_id)
        return

    s = job.settings

    # ── Fake queue for free / no-token users ──────────────────────────────────
    if not job.priority and job.queue_position > 0:
        pos      = job.queue_position
        end_time = _time.monotonic() + 180  # ~3 min fake wait
        while _time.monotonic() < end_time and pos > 1:
            _time.sleep(4)
            pos = max(1, pos - max(1, pos // 25))
            job_store.update(job_id, queue_position=pos)
        job_store.update(job_id, queue_position=0)

    try:
        job_store.update(job_id, status=JobStatus.rendering, progress=2)

        W, H = get_resolution(s.output_format, s.quality)
        fps  = OUTPUT_FPS

        audio_path = str(job.audio_path)
        _         = get_audio_duration(audio_path)
        out_path  = str(output_path(job_id))
        ensure_output_dir(job_id)

        job_store.update(job_id, progress=5)
        audio_frames = analyze_audio(audio_path, fps, smoothing=s.smoothing)
        total_frames = len(audio_frames)

        # ── Pre-build shared images ────────────────────────────────────────────
        bg_large  = None
        cover_img = None
        if job.image_path and Path(job.image_path).exists():
            raw_bg    = Image.open(job.image_path).convert("RGBA")
            bg_large  = _object_cover(raw_bg, round(W * 1.22), round(H * 1.22))
            cover_img = raw_bg

        default_bg   = _make_default_bg(W, H)
        vignette_img = _vignette(W, H)
        text_layer   = _render_text(s, W, H)

        # ── Video background (sequential — pipe-based, can't parallelise) ──────
        vid_proc = None
        vid_frame_bytes = W * H * 3
        if job.video_loop_path and Path(job.video_loop_path).exists() and bg_large is None:
            vcmd = [
                FFMPEG_PATH, "-stream_loop", "-1",
                "-i", str(job.video_loop_path),
                "-vf", (
                    f"scale={round(W*1.22)}:{round(H*1.22)}"
                    f":force_original_aspect_ratio=increase,"
                    f"crop={round(W*1.22)}:{round(H*1.22)}"
                ),
                "-r", str(fps), "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
            ]
            vid_proc = subprocess.Popen(vcmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

        # ── FFmpeg encoder ─────────────────────────────────────────────────────
        q = QUALITY_PRESETS[s.quality]
        enc_cmd = [
            FFMPEG_PATH, "-y",
            "-f", "rawvideo", "-vcodec", "rawvideo",
            "-s", f"{W}x{H}", "-pix_fmt", "rgb24",
            "-r", str(fps), "-i", "pipe:0",
            "-i", audio_path,
            "-c:v", "libx264", "-crf", str(q["crf"]), "-preset", q["preset"],
            "-threads", "0",
            "-c:a", "aac", "-b:a", "320k",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-shortest", out_path,
        ]
        enc_proc = subprocess.Popen(enc_cmd, stdin=subprocess.PIPE,
                                    stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

        log.info("Rendering %d frames at %dx%d %dfps with %d workers",
                 total_frames, W, H, fps, _RENDER_WORKERS)

        if vid_proc is not None:
            # Video background: must be sequential (ordered pipe reads)
            for fi in range(total_frames):
                raw = vid_proc.stdout.read(vid_frame_bytes)
                if len(raw) == vid_frame_bytes:
                    arr = np.frombuffer(raw, dtype=np.uint8).reshape(H, W, 3)
                    bg_large = Image.fromarray(arr, "RGB").convert("RGBA")
                frame = _render_frame(
                    bg_large, default_bg, cover_img,
                    vignette_img, text_layer,
                    audio_frames[fi] if fi < len(audio_frames) else None,
                    fi / fps, s, W, H,
                )
                enc_proc.stdin.write(frame.convert("RGB").tobytes())
                if fi % 30 == 0:
                    job_store.update(job_id, progress=min(95, 5 + round(fi / total_frames * 90)))
        else:
            # Static background: render frames in parallel ─────────────────────
            initargs = (
                bg_large.tobytes()   if bg_large   else None,
                bg_large.size        if bg_large   else None,
                default_bg.tobytes(), default_bg.size,
                cover_img.tobytes()  if cover_img  else None,
                cover_img.size       if cover_img  else None,
                vignette_img.tobytes(), vignette_img.size,
                text_layer.tobytes(),   text_layer.size,
            )
            frame_args = [
                (fi, fi / fps, audio_frames[fi] if fi < len(audio_frames) else None, s, W, H)
                for fi in range(total_frames)
            ]

            with ProcessPoolExecutor(
                max_workers=_RENDER_WORKERS,
                initializer=_worker_init,
                initargs=initargs,
            ) as pool:
                for batch_start in range(0, total_frames, _BATCH_SIZE):
                    batch = frame_args[batch_start: batch_start + _BATCH_SIZE]
                    for rgb_bytes in pool.map(_worker_render, batch):
                        enc_proc.stdin.write(rgb_bytes)
                    progress = 5 + round((batch_start + len(batch)) / total_frames * 90)
                    job_store.update(job_id, progress=min(95, progress))

        enc_proc.stdin.close()
        enc_proc.wait()

        if vid_proc is not None:
            vid_proc.stdout.close()
            vid_proc.kill()
            vid_proc.wait()

        if enc_proc.returncode != 0:
            raise RuntimeError(f"FFmpeg encoder exited with code {enc_proc.returncode}")

        from datetime import datetime
        job_store.update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            output_path=out_path,
            completed_at=datetime.utcnow(),
        )
        log.info("Job %s completed: %s", job_id, out_path)

    except Exception as exc:
        log.exception("Job %s failed: %s", job_id, exc)
        job_store.update(job_id, status=JobStatus.failed, error=str(exc))
