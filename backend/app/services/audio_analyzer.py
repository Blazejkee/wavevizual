"""
Audio analysis: decode audio with FFmpeg and compute per-frame FFT data
matching Web Audio API AnalyserNode (fftSize=2048, smoothingTimeConstant).
"""
from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from typing import List

import numpy as np

from app.config import FFMPEG_PATH

log = logging.getLogger(__name__)

FFT_SIZE  = 2048
BIN_COUNT = FFT_SIZE // 2
MIN_DB    = -100.0
MAX_DB    = -30.0


@dataclass
class AudioFrame:
    freq:   np.ndarray   # float32 [BIN_COUNT], 0-255  (mixed channels)
    freq_l: np.ndarray   # float32 [BIN_COUNT], 0-255  (left)
    freq_r: np.ndarray   # float32 [BIN_COUNT], 0-255  (right)
    wave:   np.ndarray   # float32 [FFT_SIZE],  0-255  (left, time-domain)
    bass:   float        # 0-1
    mids:   float        # 0-1
    highs:  float        # 0-1
    rms:    float        # 0-1


def _extract_pcm(audio_path: str, sample_rate: int = 48_000) -> np.ndarray:
    """Return [n_samples, 2] float32 stereo PCM array."""
    cmd = [
        FFMPEG_PATH, "-y", "-i", str(audio_path),
        "-vn", "-acodec", "pcm_f32le",
        "-ar", str(sample_rate), "-ac", "2",
        "-f", "f32le", "pipe:1",
    ]
    result = subprocess.run(cmd, capture_output=True)
    raw = result.stdout
    n = len(raw) // 8  # 4 bytes × 2 channels
    if n == 0:
        log.error("PCM extraction failed: %s", result.stderr.decode()[-300:])
        return np.zeros((sample_rate, 2), dtype=np.float32)
    return np.frombuffer(raw[: n * 8], dtype=np.float32).reshape(n, 2)


def analyze_audio(
    audio_path: str,
    fps: int,
    fft_size: int = FFT_SIZE,
    smoothing: float = 0.8,
    sample_rate: int = 48_000,
) -> List[AudioFrame]:
    """
    Produce one AudioFrame per video frame.

    Replicates AnalyserNode:
      - Hanning window
      - EMA on magnitude spectrum (smoothingTimeConstant)
      - dB scaling → 0-255  (minDecibels=-100, maxDecibels=-30)
    """
    log.info("Analyzing audio: %s  fps=%d  smoothing=%.2f", audio_path, fps, smoothing)
    samples  = _extract_pcm(audio_path, sample_rate)
    n_total  = len(samples)
    bin_count = fft_size // 2
    hop       = max(1, sample_rate // fps)
    n_frames  = max(1, n_total // hop + 1)

    window    = np.hanning(fft_size).astype(np.float32)
    smooth_l  = np.zeros(bin_count, dtype=np.float32)
    smooth_r  = np.zeros(bin_count, dtype=np.float32)

    bin_hz   = sample_rate / fft_size
    bass_end = max(1, int(250  / bin_hz))
    mids_end = max(bass_end + 1, int(4000 / bin_hz))

    def _to_bytes(mag: np.ndarray) -> np.ndarray:
        with np.errstate(divide="ignore", invalid="ignore"):
            db = 20.0 * np.log10(mag / (fft_size / 2) + 1e-10)
        return np.clip((db - MIN_DB) / (MAX_DB - MIN_DB) * 255.0, 0.0, 255.0).astype(np.float32)

    frames: List[AudioFrame] = []
    for fi in range(n_frames):
        start = max(0, fi * hop - fft_size // 2)
        chunk = np.zeros((fft_size, 2), dtype=np.float32)
        end   = min(start + fft_size, n_total)
        avail = end - start
        if avail > 0:
            chunk[:avail] = samples[start:end]

        mag_l = np.abs(np.fft.rfft(chunk[:, 0] * window)[:bin_count]).astype(np.float32)
        mag_r = np.abs(np.fft.rfft(chunk[:, 1] * window)[:bin_count]).astype(np.float32)

        smooth_l = smoothing * smooth_l + (1.0 - smoothing) * mag_l
        smooth_r = smoothing * smooth_r + (1.0 - smoothing) * mag_r

        freq_l = _to_bytes(smooth_l)
        freq_r = _to_bytes(smooth_r)
        freq   = (freq_l + freq_r) * 0.5

        wave = np.clip(chunk[:, 0] * 128.0 + 128.0, 0.0, 255.0).astype(np.float32)

        fn = freq / 255.0
        bass  = float(np.mean(fn[:bass_end]))
        mids  = float(np.mean(fn[bass_end:mids_end]))
        highs = float(np.mean(fn[mids_end:]))
        rms   = float(min(1.0, np.sqrt(np.mean(chunk[:, 0] ** 2)) * 5.0))

        frames.append(AudioFrame(
            freq=freq, freq_l=freq_l, freq_r=freq_r, wave=wave,
            bass=bass, mids=mids, highs=highs, rms=rms,
        ))

    log.info("Audio analysis done: %d frames", len(frames))
    return frames
