from __future__ import annotations

import asyncio
import logging
import random
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.auth import get_current_user_id
from app.database import get_db
from app.models import (
    ExportQuality,
    JobPublic,
    JobStatus,
    OutputFormat,
    RenderSettings,
    ZoomMode,
    Job,
    job_store,
)
from app.services.frame_renderer import render_job_frames
from app.services.storage import get_output_file, save_upload
from app.utils.validation import validate_audio, validate_image, validate_video

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_executor = ThreadPoolExecutor(max_workers=8)

TOKEN_COSTS = {"1080p": 10, "4k": 25}
FAKE_QUEUE_MIN = 120  # seconds free users wait
FAKE_QUEUE_MAX = 240


def _deduct_tokens(user_id: str, cost: int, job_id: str, quality: str) -> bool:
    """Returns True if tokens were deducted, False if insufficient balance."""
    from datetime import datetime, timezone
    db = get_db()
    row = db.execute("SELECT token_balance FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row or row["token_balance"] < cost:
        return False
    now = datetime.now(timezone.utc).isoformat()
    db.execute("UPDATE users SET token_balance = token_balance - ? WHERE id = ?", (cost, user_id))
    db.execute(
        "INSERT INTO token_usage (id, user_id, job_id, tokens, quality, created_at) VALUES (?,?,?,?,?,?)",
        (str(uuid4()), user_id, job_id, cost, quality, now),
    )
    db.commit()
    return True


# ── POST /api/jobs/create ──────────────────────────────────────────────────────

@router.post("/create", response_model=JobPublic, status_code=202)
async def create_job(
    request: Request,
    # ── Files ──
    audio:       UploadFile           = Form(...),
    cover_image: UploadFile           = Form(...),
    video_loop:  Optional[UploadFile] = Form(None),
    # ── Output ──
    song_title:    Optional[str] = Form(None),
    artist_name:   Optional[str] = Form(None),
    output_format: OutputFormat  = Form(OutputFormat.youtube),
    quality:       ExportQuality = Form(ExportQuality.hd_1080p),
    zoom_mode:     ZoomMode      = Form(ZoomMode.slow),
    show_title:    bool          = Form(True),
    show_text_overlay: bool      = Form(True),
    # ── Visualizer ──
    template:        str   = Form("bars"),
    color_mode:      str   = Form("gradient"),
    primary_color:   str   = Form("#6c63ff"),
    secondary_color: str   = Form("#00d4ff"),
    opacity:         float = Form(0.95),
    bar_count:       int   = Form(64),
    bar_width:       int   = Form(12),
    bar_gap:         int   = Form(4),
    roundness:       int   = Form(4),
    mirror:          bool  = Form(False),
    glow:            int   = Form(20),
    blur:            int   = Form(0),
    shadow:          bool  = Form(True),
    sensitivity:     float = Form(1.2),
    smoothing:       float = Form(0.8),
    bass_boost:      float = Form(1.5),
    reduce_flashing: bool  = Form(False),
    pos_x:           float = Form(50.0),
    pos_y:           float = Form(80.0),
    scale:           float = Form(1.0),
    # ── Background ──
    bg_darken:   float = Form(0.4),
    bg_vignette: bool  = Form(True),
    bg_blur:     int   = Form(0),
    bg_effect:   str   = Form("slow-zoom"),
) -> JobPublic:
    await validate_audio(audio)
    await validate_image(cover_image)
    if video_loop and video_loop.filename:
        await validate_video(video_loop)

    # ── Auth + token logic ─────────────────────────────────────────────────────
    user_id  = get_current_user_id(request.headers.get("authorization", "").replace("Bearer ", "") if "authorization" in request.headers else None)
    # Simpler: parse from header manually since Form routes can't use Depends easily
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        from app.auth import decode_token
        user_id = decode_token(auth_header[7:])
    else:
        user_id = None

    cost     = TOKEN_COSTS.get(quality.value, 10)
    priority = False

    if user_id:
        has_tokens = _deduct_tokens(user_id, cost, job_id, quality.value)
        if has_tokens:
            priority = True
        # If no tokens, fall through to free queue (don't block the render)
    # Anonymous users → fake queue automatically

    # ── Build job ─────────────────────────────────────────────────────────────
    job_id   = str(uuid4())
    settings = RenderSettings(
        song_title=song_title or None,
        artist_name=artist_name or None,
        output_format=output_format,
        quality=quality,
        zoom_mode=zoom_mode,
        show_title=show_title,
        show_text_overlay=show_text_overlay,
        template=template,
        color_mode=color_mode,
        primary_color=primary_color,
        secondary_color=secondary_color,
        opacity=opacity,
        bar_count=bar_count,
        bar_width=bar_width,
        bar_gap=bar_gap,
        roundness=roundness,
        mirror=mirror,
        glow=glow,
        blur=blur,
        shadow=shadow,
        sensitivity=sensitivity,
        smoothing=smoothing,
        bass_boost=bass_boost,
        reduce_flashing=reduce_flashing,
        pos_x=pos_x,
        pos_y=pos_y,
        scale=scale,
        bg_darken=bg_darken,
        bg_vignette=bg_vignette,
        bg_blur=bg_blur,
        bg_effect=bg_effect,
    )

    queue_pos = 0 if priority else random.randint(113, 247)

    job = Job(
        id=job_id,
        settings=settings,
        priority=priority,
        queue_position=queue_pos,
        token_cost=cost if priority else 0,
        user_id=user_id,
    )
    job_store.add(job)

    audio_path = await save_upload(audio, job_id, "audio")
    image_path = await save_upload(cover_image, job_id, "cover")
    video_loop_path = None
    if video_loop and video_loop.filename:
        video_loop_path = await save_upload(video_loop, job_id, "loop")

    job_store.update(
        job_id,
        audio_path=str(audio_path),
        image_path=str(image_path),
        video_loop_path=str(video_loop_path) if video_loop_path else None,
    )

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, render_job_frames, job_id)

    base_url = str(request.base_url).rstrip("/")
    job = job_store.get(job_id)
    assert job is not None
    return JobPublic.from_job(job, base_url)


# ── GET /api/jobs/{job_id} ─────────────────────────────────────────────────────

@router.get("/{job_id}", response_model=JobPublic)
async def get_job(job_id: str, request: Request) -> JobPublic:
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    base_url = str(request.base_url).rstrip("/")
    return JobPublic.from_job(job, base_url)


# ── GET /api/jobs/{job_id}/download ───────────────────────────────────────────

@router.get("/{job_id}/download")
async def download_job(job_id: str) -> FileResponse:
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    if job.status != JobStatus.completed:
        raise HTTPException(409, f"Job is not completed yet (status: {job.status}).")
    file = get_output_file(job_id)
    if file is None:
        raise HTTPException(404, "Output file missing.")
    title  = job.settings.song_title or "visualizer"
    artist = job.settings.artist_name or ""
    safe   = "".join(c for c in f"{artist} - {title}" if c.isalnum() or c in " -_").strip()
    return FileResponse(path=str(file), media_type="video/mp4", filename=f"{safe or 'output'}.mp4")


# ── GET /api/jobs ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[JobPublic])
async def list_jobs(request: Request, limit: int = 20) -> List[JobPublic]:
    base_url = str(request.base_url).rstrip("/")
    return [JobPublic.from_job(j, base_url) for j in job_store.list_recent(limit)]
