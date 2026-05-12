import shutil
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import UploadFile

from app.config import OUTPUTS_DIR, UPLOADS_DIR
from app.utils.validation import sanitize_filename


async def save_upload(file: UploadFile, job_id: str, slot: str) -> Path:
    """
    Stream an uploaded file to disk under uploads/<job_id>/<slot>_<original_name>.
    Returns the absolute path to the saved file.
    """
    job_upload_dir = UPLOADS_DIR / job_id
    job_upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = sanitize_filename(file.filename or "upload")
    dest = job_upload_dir / f"{slot}_{safe_name}"

    async with aiofiles.open(dest, "wb") as out:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            await out.write(chunk)

    return dest


def ensure_output_dir(job_id: str) -> Path:
    out_dir = OUTPUTS_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def output_path(job_id: str) -> Path:
    return OUTPUTS_DIR / job_id / "output.mp4"


def cleanup_job(job_id: str) -> None:
    """Delete all upload and output files for a job."""
    for base in (UPLOADS_DIR, OUTPUTS_DIR):
        job_dir = base / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)


def get_output_file(job_id: str) -> Optional[Path]:
    path = output_path(job_id)
    return path if path.exists() else None
