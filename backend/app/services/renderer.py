"""
Orchestrates a full render job:
  1. Detects audio duration via FFprobe
  2. Builds the FFmpeg filter_complex
  3. Runs FFmpeg, streaming progress to the job store
  4. Updates job status on completion or failure
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import OUTPUT_FPS
from app.models import JobStatus, job_store
from app.services.ffmpeg import (
    build_ffmpeg_command,
    build_filter_complex,
    detect_beats,
    find_system_font,
    get_audio_duration,
    get_resolution,
    run_ffmpeg,
)
from app.services.storage import ensure_output_dir, output_path

log = logging.getLogger(__name__)


def render_job(job_id: str) -> None:
    """
    Blocking function — intended to run in a thread pool.
    Reads job details from job_store, renders the video, and updates status.
    """
    job = job_store.get(job_id)
    if job is None:
        log.error("render_job: job %s not found", job_id)
        return

    try:
        job_store.update(job_id, status=JobStatus.rendering, progress=2)

        # ── Resolve paths ──────────────────────────────────────────────────────
        audio_path: Path = Path(job.audio_path)  # type: ignore[arg-type]
        image_path: Optional[Path] = Path(job.image_path) if job.image_path else None
        video_loop_path: Optional[Path] = (
            Path(job.video_loop_path) if job.video_loop_path else None
        )

        out_dir = ensure_output_dir(job_id)
        out_path = output_path(job_id)

        # ── Audio duration ─────────────────────────────────────────────────────
        job_store.update(job_id, progress=5)
        audio_duration = get_audio_duration(audio_path)
        log.info("Job %s: audio duration = %.2f s", job_id, audio_duration)

        # ── Settings ───────────────────────────────────────────────────────────
        settings = job.settings
        width, height = get_resolution(settings.output_format, settings.quality)
        fps = OUTPUT_FPS
        total_frames = int(audio_duration * fps)

        has_video_loop = video_loop_path is not None and video_loop_path.exists()
        if not has_video_loop and image_path is None:
            raise ValueError("No background source: need either a video loop or a cover image.")

        # ── Text files (avoids shell-escaping issues in drawtext) ──────────────
        title_file: Optional[Path] = None
        artist_file: Optional[Path] = None

        if settings.show_title:
            if settings.song_title:
                title_file = out_dir / "title.txt"
                title_file.write_text(settings.song_title)
            if settings.artist_name:
                artist_file = out_dir / "artist.txt"
                artist_file.write_text(settings.artist_name)

        font_path = find_system_font()
        if font_path:
            log.info("Job %s: using font %s", job_id, font_path)
        else:
            log.warning("Job %s: no system font found — drawtext will use built-in font", job_id)

        # ── Beat detection (only when needed) ─────────────────────────────────
        beats = None
        if settings.zoom_mode == "beat":
            job_store.update(job_id, progress=8)
            log.info("Job %s: running beat detection…", job_id)
            beats = detect_beats(audio_path)
            log.info("Job %s: %d beats detected", job_id, len(beats))

        # ── Build filter_complex ───────────────────────────────────────────────
        job_store.update(job_id, progress=12)
        filter_complex, out_label = build_filter_complex(
            has_video_loop=has_video_loop,
            width=width,
            height=height,
            fps=fps,
            total_frames=total_frames,
            audio_duration=audio_duration,
            waveform_style=settings.waveform_style,
            waveform_position=settings.waveform_position,
            show_title=settings.show_title,
            song_title=settings.song_title,
            artist_name=settings.artist_name,
            zoom_mode=settings.zoom_mode,
            beats=beats,
            wave_color=settings.wave_color,
            wave_opacity=settings.wave_opacity,
            wave_height_pct=settings.wave_height_pct,
            wave_width_pct=settings.wave_width_pct,
            wave_glow=settings.wave_glow,
            wave_mirror=settings.wave_mirror,
            font_path=font_path,
            title_file=title_file,
            artist_file=artist_file,
        )

        # ── Build FFmpeg command ───────────────────────────────────────────────
        cmd = build_ffmpeg_command(
            audio_path=audio_path,
            image_path=image_path,
            video_loop_path=video_loop_path if has_video_loop else None,
            output_path=out_path,
            filter_complex=filter_complex,
            out_label=out_label,
            audio_duration=audio_duration,
            quality=settings.quality,
        )

        # ── Run FFmpeg ─────────────────────────────────────────────────────────
        def on_progress(pct: int) -> None:
            job_store.update(job_id, progress=max(10, pct))

        run_ffmpeg(cmd, audio_duration, progress_cb=on_progress)

        # ── Done ───────────────────────────────────────────────────────────────
        job_store.update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            completed_at=datetime.utcnow(),
            output_path=str(out_path),
        )
        log.info("Job %s completed: %s", job_id, out_path)

    except Exception as exc:  # noqa: BLE001
        log.exception("Job %s failed: %s", job_id, exc)
        job_store.update(
            job_id,
            status=JobStatus.failed,
            error=str(exc),
            completed_at=datetime.utcnow(),
        )
