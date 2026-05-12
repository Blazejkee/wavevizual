import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import (
    ALLOWED_AUDIO_TYPES,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    MAX_AUDIO_SIZE,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
)


# ── Filename sanitisation ──────────────────────────────────────────────────────

_SAFE_NAME = re.compile(r"[^\w\-.]")


def sanitize_filename(name: str) -> str:
    """Strip path traversal and unsafe characters from an uploaded filename."""
    # Strip directory components
    name = Path(name).name
    # Replace any non-word character (except dash and dot) with underscore
    name = _SAFE_NAME.sub("_", name)
    # Collapse multiple dots to prevent double-extension attacks
    name = re.sub(r"\.{2,}", ".", name)
    return name[:255] or "file"


# ── File type + size validation ────────────────────────────────────────────────

async def _read_header(file: UploadFile, n: int = 512) -> bytes:
    header = await file.read(n)
    await file.seek(0)
    return header


def _detect_mime(header: bytes, content_type: str) -> str:
    """Augment the browser-supplied content_type with a magic-bytes check."""
    # MP3: starts with ID3 tag or 0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xE3 sync bytes
    if header[:3] == b"ID3" or (len(header) >= 2 and header[0] == 0xFF and header[1] & 0xE0 == 0xE0):
        return "audio/mpeg"
    # RIFF WAV
    if header[:4] == b"RIFF" and header[8:12] == b"WAVE":
        return "audio/wav"
    # PNG
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    # JPEG
    if header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    # MP4 / MOV (ftyp box at offset 4)
    if header[4:8] in (b"ftyp", b"moov", b"mdat"):
        return "video/mp4"
    # WebM
    if header[:4] == b"\x1a\x45\xdf\xa3":
        return "video/webm"
    return content_type or "application/octet-stream"


async def validate_audio(file: UploadFile) -> None:
    header = await _read_header(file)
    mime = _detect_mime(header, file.content_type or "")
    if mime not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            400,
            f"Invalid audio type '{mime}'. Allowed: MP3, WAV.",
        )
    if file.size and file.size > MAX_AUDIO_SIZE:
        raise HTTPException(
            400,
            f"Audio file too large. Maximum size is {MAX_AUDIO_SIZE // 1024 // 1024} MB.",
        )


async def validate_image(file: UploadFile) -> None:
    header = await _read_header(file)
    mime = _detect_mime(header, file.content_type or "")
    if mime not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            400,
            f"Invalid image type '{mime}'. Allowed: JPG, PNG.",
        )
    if file.size and file.size > MAX_IMAGE_SIZE:
        raise HTTPException(
            400,
            f"Image file too large. Maximum size is {MAX_IMAGE_SIZE // 1024 // 1024} MB.",
        )


async def validate_video(file: UploadFile) -> None:
    header = await _read_header(file)
    mime = _detect_mime(header, file.content_type or "")
    if mime not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            400,
            f"Invalid video type '{mime}'. Allowed: MP4, MOV, WebM.",
        )
    if file.size and file.size > MAX_VIDEO_SIZE:
        raise HTTPException(
            400,
            f"Video file too large. Maximum size is {MAX_VIDEO_SIZE // 1024 // 1024} MB.",
        )


# ── Text sanitisation for FFmpeg drawtext ─────────────────────────────────────

_DRAWTEXT_UNSAFE = re.compile(r"[\\'\[\]{}|<>]")


def sanitize_drawtext(text: str) -> str:
    """Remove characters that could break FFmpeg filter syntax."""
    text = _DRAWTEXT_UNSAFE.sub("", text)
    text = text.replace(":", " ")
    return text[:100].strip()
