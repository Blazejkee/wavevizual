from __future__ import annotations

import threading
from datetime import datetime
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────────────────────

class OutputFormat(str, Enum):
    youtube = "youtube"      # 16:9
    shorts = "shorts"        # 9:16
    instagram = "instagram"  # 1:1


class WaveformStyle(str, Enum):
    line = "line"
    bars = "bars"
    circular = "circular"
    minimal = "minimal"
    dual = "dual"      # dual stereo channel bars


class WaveformPosition(str, Enum):
    bottom = "bottom"
    center = "center"
    top = "top"


class ExportQuality(str, Enum):
    hd_1080p = "1080p"
    uhd_4k = "4k"


class ZoomMode(str, Enum):
    none = "none"
    slow = "slow"    # cinematic slow push-in
    beat = "beat"    # pulse zoom locked to detected beats


class JobStatus(str, Enum):
    queued = "queued"
    rendering = "rendering"
    completed = "completed"
    failed = "failed"


# ── Render settings ────────────────────────────────────────────────────────────

class WaveGlow(str, Enum):
    none   = "none"
    soft   = "soft"
    strong = "strong"


class RenderSettings(BaseModel):
    # ── Output ───────────────────────────────────────────────────────────────
    song_title:    Optional[str] = Field(None, max_length=120)
    artist_name:   Optional[str] = Field(None, max_length=120)
    output_format: OutputFormat  = OutputFormat.youtube
    quality:       ExportQuality = ExportQuality.hd_1080p
    zoom_mode:     ZoomMode      = ZoomMode.slow
    show_title:    bool          = True
    show_text_overlay: bool      = True

    # ── Visualizer template ───────────────────────────────────────────────────
    template:     str   = "bars"
    color_mode:   str   = "gradient"
    primary_color:   str   = Field("#6c63ff", pattern=r"^#[0-9a-fA-F]{6}$")
    secondary_color: str   = Field("#00d4ff", pattern=r"^#[0-9a-fA-F]{6}$")
    opacity:         float = Field(0.95, ge=0.0, le=1.0)
    bar_count:       int   = Field(64,   ge=8,   le=256)
    bar_width:       int   = Field(12,   ge=1,   le=30)
    bar_gap:         int   = Field(4,    ge=0,   le=20)
    roundness:       int   = Field(4,    ge=0,   le=20)
    mirror:          bool  = False
    glow:            int   = Field(20,   ge=0,   le=60)
    blur:            int   = Field(0,    ge=0,   le=8)
    shadow:          bool  = True
    sensitivity:     float = Field(1.2,  ge=0.3, le=4.0)
    smoothing:       float = Field(0.8,  ge=0.0, le=0.99)
    bass_boost:      float = Field(1.5,  ge=0.0, le=5.0)
    reduce_flashing: bool  = False
    pos_x:           float = Field(50.0, ge=0.0, le=100.0)
    pos_y:           float = Field(80.0, ge=0.0, le=100.0)
    scale:           float = Field(1.0,  ge=0.1, le=3.0)

    # ── Background ────────────────────────────────────────────────────────────
    bg_darken:   float = Field(0.4, ge=0.0, le=0.8)
    bg_vignette: bool  = True
    bg_blur:     int   = Field(0,   ge=0,   le=20)
    bg_effect:   str   = "slow-zoom"


# ── Job model ──────────────────────────────────────────────────────────────────

class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.queued
    progress: int = 0  # 0-100
    queue_position: int = 0  # >0 = fake queue for free users
    priority: bool = False   # True = skip fake queue
    token_cost: int = 0
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    settings: RenderSettings

    # Internal file paths (not exposed in API responses)
    audio_path: Optional[str] = None
    image_path: Optional[str] = None
    video_loop_path: Optional[str] = None
    output_path: Optional[str] = None


class JobPublic(BaseModel):
    """Sanitised job model returned to the client."""
    id: str
    status: JobStatus
    progress: int
    queue_position: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    settings: RenderSettings
    download_url: Optional[str] = None
    token_cost: int = 0

    @staticmethod
    def from_job(job: Job, request_base_url: str = "") -> "JobPublic":
        download_url = None
        if job.status == JobStatus.completed and job.output_path:
            download_url = f"{request_base_url}/api/jobs/{job.id}/download"
        return JobPublic(
            id=job.id,
            status=job.status,
            progress=job.progress,
            queue_position=job.queue_position,
            created_at=job.created_at,
            completed_at=job.completed_at,
            error=job.error,
            settings=job.settings,
            download_url=download_url,
            token_cost=job.token_cost,
        )


# ── Thread-safe in-memory job store ───────────────────────────────────────────

class JobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()

    def add(self, job: Job) -> None:
        with self._lock:
            self._jobs[job.id] = job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            updated = job.model_copy(update=kwargs)
            self._jobs[job_id] = updated

    def list_recent(self, limit: int = 20) -> list[Job]:
        with self._lock:
            jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
            return jobs[:limit]


# Singleton store shared across the application
job_store = JobStore()
