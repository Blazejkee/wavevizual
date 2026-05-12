import os
from pathlib import Path


# ── Paths ──────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent.parent  # project root
STORAGE_BASE = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_BASE / "uploads"
OUTPUTS_DIR = STORAGE_BASE / "outputs"

# Ensure directories exist at import time
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


# ── FFmpeg ─────────────────────────────────────────────────────────────────────

_BIN_DIR = BASE_DIR / "bin"
_LOCAL_FFMPEG  = str(_BIN_DIR / "ffmpeg")
_LOCAL_FFPROBE = str(_BIN_DIR / "ffprobe")

FFMPEG_PATH  = os.environ.get("FFMPEG_PATH",  _LOCAL_FFMPEG)
FFPROBE_PATH = os.environ.get("FFPROBE_PATH", _LOCAL_FFPROBE)

# Target FPS for output video
OUTPUT_FPS = 25


# ── File size limits (bytes) ────────────────────────────────────────────────────

MAX_AUDIO_SIZE = 300 * 1024 * 1024   # 300 MB
MAX_IMAGE_SIZE = 50 * 1024 * 1024    # 50 MB
MAX_VIDEO_SIZE = 1024 * 1024 * 1024  # 1 GB


# ── Allowed MIME types ─────────────────────────────────────────────────────────

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/x-pn-wav",
}

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-m4v",
}


# ── Render quality presets ─────────────────────────────────────────────────────

QUALITY_PRESETS = {
    "1080p": {"crf": 20, "preset": "medium"},
    "4k":    {"crf": 18, "preset": "slow"},
}


# ── Resolution map  (format → quality → (width, height)) ──────────────────────

RESOLUTIONS = {
    "youtube":   {"1080p": (1920, 1080), "4k": (3840, 2160)},
    "shorts":    {"1080p": (1080, 1920), "4k": (2160, 3840)},
    "instagram": {"1080p": (1080, 1080), "4k": (2160, 2160)},
}
