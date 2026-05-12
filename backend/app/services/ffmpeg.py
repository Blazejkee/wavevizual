"""
Low-level FFmpeg/FFprobe wrappers.

All heavy lifting (filter_complex construction, progress parsing) lives here.
The renderer service calls these functions.
"""

from __future__ import annotations

import array
import json
import logging
import math
import platform
import re
import subprocess
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from app.config import FFMPEG_PATH, FFPROBE_PATH, OUTPUT_FPS, QUALITY_PRESETS, RESOLUTIONS
from app.utils.validation import sanitize_drawtext

log = logging.getLogger(__name__)


# ── System checks ──────────────────────────────────────────────────────────────

def check_ffmpeg() -> None:
    import shutil
    for binary in (FFMPEG_PATH, FFPROBE_PATH):
        if not shutil.which(binary):
            raise RuntimeError(
                f"'{binary}' not found in PATH. "
                "Please install FFmpeg: https://ffmpeg.org/download.html"
            )


# ── FFprobe helpers ────────────────────────────────────────────────────────────

def get_audio_duration(audio_path: str | Path) -> float:
    """Return audio duration in seconds."""
    cmd = [
        FFPROBE_PATH,
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "audio":
            return float(stream["duration"])
    raise ValueError(f"No audio stream found in {audio_path}")


# ── Beat detection ─────────────────────────────────────────────────────────────

def detect_beats(audio_path: str | Path, max_beats: int = 250) -> List[float]:
    """
    Detect beat onset times via energy-peak analysis.

    Algorithm:
      1. Downsample audio to 8 kHz mono PCM via FFmpeg pipe.
      2. Build a cumulative sum-of-squares so RMS energy per frame is O(1).
      3. For each frame, compare against the local mean (±43 frames ≈ ±690 ms).
      4. Treat local maxima above 1.5× the local mean as onsets.
      5. Enforce a 250 ms minimum gap between beats.

    Returns a sorted list of timestamps in seconds.
    """
    SR     = 8_000   # analysis sample rate — enough for bass-band beat energy
    WINDOW = 512     # ~64 ms
    HOP    = 128     # ~16 ms  →  62.5 frames / second
    SMOOTH = 43      # ±43 frames ≈ ±690 ms local context window
    THRESH = 1.5     # energy must exceed local mean × this factor
    MIN_GAP_S = 0.25 # minimum seconds between accepted beats

    log.info("Beat detection: extracting PCM from %s", audio_path)

    cmd = [
        FFMPEG_PATH, "-y", "-i", str(audio_path),
        "-vn",  # ignore any embedded cover art / video streams
        "-af", f"aresample={SR},aformat=sample_fmts=s16:channel_layouts=mono",
        "-f", "s16le", "pipe:1",
    ]
    result = subprocess.run(cmd, capture_output=True)
    raw = result.stdout
    if not raw or len(raw) < WINDOW * 2:
        log.warning("Beat detection: audio too short or extraction failed")
        return []

    # Parse raw bytes into signed 16-bit samples (fast via array module)
    n_samples = len(raw) // 2
    samples: array.array = array.array("h")
    samples.frombytes(raw[: n_samples * 2])

    # Cumulative sum of squares — enables O(1) windowed energy queries
    cum: list[int] = [0] * (n_samples + 1)
    for i in range(n_samples):
        cum[i + 1] = cum[i] + samples[i] * samples[i]

    # RMS energy per hop frame
    n_frames = (n_samples - WINDOW) // HOP
    energy: list[float] = [
        (cum[i * HOP + WINDOW] - cum[i * HOP]) / WINDOW
        for i in range(n_frames)
    ]

    if not energy:
        return []

    # Pre-compute running window sum for the local mean (sliding window, O(n) total)
    half = SMOOTH
    win_size = 2 * half + 1
    # Seed the first window
    window_sum = sum(energy[: min(win_size, n_frames)])
    window_count = min(win_size, n_frames)

    beats: list[float] = []
    min_gap_frames = int(MIN_GAP_S * SR / HOP)
    last_beat_frame = -min_gap_frames

    for i in range(n_frames):
        # Slide window: add right edge, remove left edge
        right = i + half
        left  = i - half - 1
        if right < n_frames:
            if right >= win_size:  # window is full — remove left
                window_sum += energy[right] - energy[left + 1]
            else:
                window_sum += energy[right]
                window_count += 1
        local_mean = window_sum / window_count if window_count else 1.0

        # Local maximum above threshold, respecting minimum gap
        if (
            i > 0
            and i < n_frames - 1
            and energy[i] >= energy[i - 1]
            and energy[i] >= energy[i + 1]
            and energy[i] > local_mean * THRESH
            and i - last_beat_frame >= min_gap_frames
        ):
            t = i * HOP / SR
            beats.append(t)
            last_beat_frame = i
            if len(beats) >= max_beats:
                break

    log.info("Beat detection: found %d beats in %.1f s of audio", len(beats), n_samples / SR)
    return beats


def build_beat_zoom_expr(
    beats: List[float],
    zoom_amount: float = 0.13,
    decay_s: float = 0.22,
    time_expr: str = "t",
) -> str:
    """
    Build an FFmpeg expression that pulses to `1 + zoom_amount` on each beat
    and decays linearly back to 1.0 over `decay_s` seconds.

    time_expr controls how "current time" is expressed:
      - "t"      for filters that expose t as PTS seconds (scale with eval=frame)
      - "n/fps"  for zoompan, which only exposes n (frame counter)
    """
    if not beats:
        return "1"

    # FFmpeg's expression evaluator has an instruction-count limit (~512 ops).
    # Each between() term is ~8 ops, so cap at 50 terms and subsample evenly
    # across the whole beat list so the zoom effect spans the entire song.
    MAX_TERMS = 50
    if len(beats) > MAX_TERMS:
        step = len(beats) / MAX_TERMS
        beats = [beats[int(i * step)] for i in range(MAX_TERMS)]

    terms: list[str] = []
    for bt in beats:
        end = bt + decay_s
        terms.append(
            f"between({time_expr},{bt:.3f},{end:.3f})*{zoom_amount:.4f}"
            f"*(1-({time_expr}-{bt:.3f})/{decay_s:.3f})"
        )

    zoom_sum = "+".join(terms)
    max_zoom = 1.0 + zoom_amount
    return f"min({max_zoom:.4f},1+{zoom_sum})"


# ── Font discovery ─────────────────────────────────────────────────────────────

def find_system_font() -> Optional[str]:
    """Return the path to a usable TrueType font, or None to use FFmpeg built-in."""
    system = platform.system()
    candidates: list[str] = []

    if system == "Darwin":
        candidates = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSMono.ttf",
        ]
    elif system == "Linux":
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
    elif system == "Windows":
        candidates = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
        ]

    for path in candidates:
        if Path(path).exists():
            return path
    return None


# ── Resolution helpers ─────────────────────────────────────────────────────────

def get_resolution(output_format: str, quality: str) -> Tuple[int, int]:
    return RESOLUTIONS[output_format][quality]


# ── Filter complex builder ─────────────────────────────────────────────────────

def _escape_path(p: str | Path) -> str:
    """Escape a file path for use in an FFmpeg filter option value."""
    return str(p).replace("\\", "/").replace(":", "\\:")


def build_filter_complex(
    *,
    has_video_loop: bool,
    width: int,
    height: int,
    fps: int,
    total_frames: int,
    audio_duration: float,
    waveform_style: str,
    waveform_position: str,
    show_title: bool,
    song_title: Optional[str],
    artist_name: Optional[str],
    zoom_mode: str,
    beats: Optional[List[float]],
    # ── Waveform appearance ──────────────────────────────────────────────────
    wave_color: str,
    wave_opacity: float,
    wave_height_pct: int,
    wave_width_pct: int,
    wave_glow: str,             # "none" | "soft" | "strong"
    wave_mirror: bool,
    font_path: Optional[str],
    title_file: Optional[Path],
    artist_file: Optional[Path],
) -> Tuple[str, str]:
    """
    Build an FFmpeg filter_complex string.

    Returns (filter_complex_string, output_label).
    """
    parts: list[str] = []

    # ── 1. Background ──────────────────────────────────────────────────────────

    if has_video_loop:
        # Input 0 = video loop (looped via -stream_loop -1 on the command line)
        if zoom_mode == "beat" and beats:
            # For video loops: scale each frame dynamically using eval=frame,
            # then crop back to target size — beats drive the scale factor.
            beat_expr = build_beat_zoom_expr(beats)
            bg = (
                f"[0:v]"
                f"scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},"
                f"setsar=1,"
                # Scale up by the beat-zoom factor (eval=frame → per-frame expression)
                f"scale='iw*({beat_expr})':'ih*({beat_expr})':eval=frame:flags=bicubic,"
                # crop x/y with expressions are evaluated per-frame automatically
                f"crop={width}:{height}:'(in_w-{width})/2':'(in_h-{height})/2'"
                f"[bg]"
            )
        else:
            bg = (
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},setsar=1[bg]"
            )
    else:
        # ── Static image background ────────────────────────────────────────────
        if zoom_mode == "slow":
            # Cinematic push-in: slow zoom from 1.0 → 1.5× over the whole duration
            bg = (
                f"[0:v]"
                f"scale={width * 2}:{height * 2}:force_original_aspect_ratio=increase,"
                f"crop={width * 2}:{height * 2},"
                f"zoompan="
                    f"z='min(zoom+0.0015,1.5)':"
                    f"x='iw/2-(iw/zoom/2)':"
                    f"y='ih/2-(ih/zoom/2)':"
                    f"d={total_frames}:"
                    f"s={width}x{height}:"
                    f"fps={fps},"
                f"setsar=1[bg]"
            )
        elif zoom_mode == "beat" and beats:
            # Beat-synced zoom using scale+crop — same approach as video loops.
            # Avoids zoompan entirely (zoompan's expression evaluator fails with
            # many beats and uses n instead of t for time).
            beat_z = build_beat_zoom_expr(beats, time_expr="t")
            bg = (
                f"[0:v]"
                # Scale to 2× so scale-up always has source pixels
                f"scale={width * 2}:{height * 2}:force_original_aspect_ratio=increase,"
                f"crop={width * 2}:{height * 2},"
                f"scale='iw*({beat_z})':'ih*({beat_z})':eval=frame:flags=bicubic,"
                f"crop={width}:{height}:'(in_w-{width})/2':'(in_h-{height})/2',"
                f"setsar=1[bg]"
            )
        else:
            # No zoom — just scale/crop to fit
            bg = (
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height},setsar=1[bg]"
            )

    parts.append(bg)

    # ── 2. Waveform ────────────────────────────────────────────────────────────

    audio_ref = "[1:a]"

    # ── Colour string for FFmpeg ──────────────────────────────────────────────
    hex_color = wave_color.lstrip("#")          # e.g. "7c4dff"
    r_val = int(hex_color[0:2], 16)
    g_val = int(hex_color[2:4], 16)
    b_val = int(hex_color[4:6], 16)
    alpha_byte = round(wave_opacity * 255)
    # 0xRRGGBBAA — the only format accepted by all FFmpeg filters (showwaves,
    # showfreqs, avectorscope). The "0xRRGGBB@float" notation is only valid for
    # named-color strings and is silently ignored (→ white) in some filters.
    ffmpeg_color = f"0x{hex_color}{alpha_byte:02x}"  # e.g. "0x7c4dffe5"

    # ── Dimensions (clamped to sane pixel minimums) ───────────────────────────
    if waveform_style == "circular":
        circ_base = min(width, height) * wave_height_pct // 100
        circ = max(120, circ_base)
        ww = wh = circ
    else:
        wh = max(60,  int(height * wave_height_pct / 100))
        ww = max(100, int(width  * wave_width_pct  / 100))

    # ── Glow helper: produces a [wraw] → [wglow] chain fragment ──────────────
    def _glow_chain(src: str, dst: str) -> str:
        """
        Build a filter fragment that optionally adds a glow to `src` and
        outputs to `dst`. Returns empty string when glow == none.
        Uses split + gblur + screen-blend so the sharp core is preserved.
        """
        if wave_glow == "none":
            return f"{src}colorkey=black:0.15:0.0{dst}"
        sigma = 4 if wave_glow == "soft" else 14
        # Unique intermediate labels (won't clash — job is single-threaded)
        return (
            f"{src}split[_gs1][_gs2];"
            f"[_gs2]gblur=sigma={sigma}[_gb];"
            f"[_gs1][_gb]blend=all_mode=screen[_gbl];"
            f"[_gbl]colorkey=black:0.12:0.0{dst}"
        )

    # ── Mirror helper: vflip + screen-blend for symmetric look ───────────────
    def _mirror_chain(src: str, dst: str) -> str:
        if not wave_mirror:
            return f"{src}null{dst}"  # passthrough
        return (
            f"{src}split[_ms1][_ms2];"
            f"[_ms2]vflip[_mf];"
            f"[_ms1][_mf]blend=all_mode=addition{dst}"
        )

    # ── Raw waveform filter (before glow / mirror) ────────────────────────────
    if waveform_style == "circular":
        raw_wave = (
            f"{audio_ref}avectorscope="
                f"s={circ}x{circ}:zoom=1.4:draw=line:scale=lin:"
                f"rc={r_val}:gc={g_val}:bc={b_val}:rf=0:gf=0:bf=0,"
            f"format=rgba"
        )
        if waveform_position == "bottom":
            ox, oy = f"(W-{circ})/2", f"H-{circ}-30"
        elif waveform_position == "top":
            ox, oy = f"(W-{circ})/2", "30"
        else:
            ox, oy = f"(W-{circ})/2", f"(H-{circ})/2"

    elif waveform_style == "bars":
        # showfreqs renders frequency-domain bars that match the canvas DFT preview:
        # fscale=log  → log-spaced bins (canvas uses F_MIN=40 Hz → F_MAX=8 kHz log scale)
        # ascale=log  → log amplitude so quiet bars are still visible (mirrors canvas boost)
        # win_size=2048 → same window size as the canvas DFT
        # comb=true   → mirror mode: bars grow from centre both up and down
        raw_wave = (
            f"{audio_ref}showfreqs="
                f"s={ww}x{wh}:mode=bar:fscale=log:ascale=log:"
                f"win_size=2048:win_func=hanning:colors={ffmpeg_color}|{ffmpeg_color}:rate={fps},"
            f"format=rgba"
        )
        if waveform_position == "bottom":
            ox, oy = f"(W-{ww})/2", f"H-{wh}-20"
        elif waveform_position == "top":
            ox, oy = f"(W-{ww})/2", "20"
        else:
            ox, oy = f"(W-{ww})/2", f"(H-{wh})/2"

    elif waveform_style == "dual":
        # Dual stereo: split L/R channels, render each as bars, hstack side by side
        half_ww = ww // 2
        raw_wave = (
            f"{audio_ref}channelsplit=channel_layout=stereo[_dl][_dr];"
            f"[_dl]showwaves=s={half_ww}x{wh}:mode=p2p:colors={ffmpeg_color}:rate={fps},format=rgba[_wl];"
            f"[_dr]showwaves=s={half_ww}x{wh}:mode=p2p:colors={ffmpeg_color}:rate={fps},format=rgba[_wr];"
            f"[_wl][_wr]hstack"
        )
        if waveform_position == "bottom":
            ox, oy = f"(W-{ww})/2", f"H-{wh}-20"
        elif waveform_position == "top":
            ox, oy = f"(W-{ww})/2", "20"
        else:
            ox, oy = f"(W-{ww})/2", f"(H-{wh})/2"

    elif waveform_style == "minimal":
        raw_wave = (
            f"{audio_ref}showwaves="
                f"s={ww}x{wh}:mode=point:colors={ffmpeg_color}:rate={fps},"
            f"format=rgba"
        )
        if waveform_position == "bottom":
            ox, oy = f"(W-{ww})/2", f"H-{wh}-20"
        elif waveform_position == "top":
            ox, oy = f"(W-{ww})/2", "20"
        else:
            ox, oy = f"(W-{ww})/2", f"(H-{wh})/2"

    else:  # line (default)
        # p2p (peak-to-peak) fills the waveform area between consecutive samples —
        # much more visible than mode=line which draws 1px vertical bars from zero.
        # cline mirrors from center, used when wave_mirror is on.
        wave_mode = "cline" if wave_mirror else "p2p"
        raw_wave = (
            f"{audio_ref}showwaves="
                f"s={ww}x{wh}:mode={wave_mode}:colors={ffmpeg_color}:rate={fps},"
            f"format=rgba"
        )
        if waveform_position == "bottom":
            ox, oy = f"(W-{ww})/2", f"H-{wh}-20"
        elif waveform_position == "top":
            ox, oy = f"(W-{ww})/2", "20"
        else:
            ox, oy = f"(W-{ww})/2", f"(H-{wh})/2"

    # ── Assemble: raw → [mirror?] → [glow] → [waves] ─────────────────────────
    if waveform_style == "dual":
        # Dual uses a multi-segment filter graph already; just add colorkey
        parts.append(f"{raw_wave}[_wraw_pre];" + _glow_chain("[_wraw_pre]", "[waves]"))
    elif waveform_style in ("bars", "minimal", "circular") and wave_mirror:
        # Universal mirror: vflip + screen blend, then glow
        parts.append(
            f"{raw_wave}[_wraw_pre];"
            + _mirror_chain("[_wraw_pre]", "[_wmir];")
            + _glow_chain("[_wmir]", "[waves]")
        )
    elif waveform_style == "line" and wave_mirror:
        # Line: cline mode already handles symmetry, just apply glow
        parts.append(f"{raw_wave}[_wraw_pre];" + _glow_chain("[_wraw_pre]", "[waves]"))
    else:
        parts.append(f"{raw_wave}[_wraw_pre];" + _glow_chain("[_wraw_pre]", "[waves]"))


    # ── 3. Overlay waveform on background ──────────────────────────────────────

    parts.append(f"[bg][waves]overlay={ox}:{oy}:format=auto[vid0]")

    # ── 4. Text overlays ───────────────────────────────────────────────────────

    font_opt = f":fontfile='{_escape_path(font_path)}'" if font_path else ""
    title_size = max(36, height // 18)
    artist_size = max(28, height // 26)

    label_in = "vid0"
    label_idx = 1

    if show_title and title_file and title_file.exists() and song_title:
        t_path = _escape_path(title_file)
        label_out = f"vid{label_idx}"
        parts.append(
            f"[{label_in}]drawtext="
                f"textfile='{t_path}'"
                f"{font_opt}"
                f":fontsize={title_size}"
                f":fontcolor=white"
                f":x=(w-text_w)/2"
                f":y=50"
                f":shadowcolor=black@0.85"
                f":shadowx=3:shadowy=3"
            f"[{label_out}]"
        )
        label_in = label_out
        label_idx += 1

    if show_title and artist_file and artist_file.exists() and artist_name:
        a_path = _escape_path(artist_file)
        label_out = f"vid{label_idx}"
        parts.append(
            f"[{label_in}]drawtext="
                f"textfile='{a_path}'"
                f"{font_opt}"
                f":fontsize={artist_size}"
                f":fontcolor=white@0.85"
                f":x=(w-text_w)/2"
                f":y={50 + title_size + 12}"
                f":shadowcolor=black@0.85"
                f":shadowx=2:shadowy=2"
            f"[{label_out}]"
        )
        label_in = label_out
        label_idx += 1

    # Final output label
    out_label = "out"
    parts.append(f"[{label_in}]copy[{out_label}]")

    return ";".join(parts), out_label


# ── FFmpeg runner with progress ────────────────────────────────────────────────

def run_ffmpeg(
    cmd: list[str],
    audio_duration: float,
    progress_cb: Optional[Callable[[int], None]] = None,
) -> None:
    """
    Run an FFmpeg command, parsing stderr for progress updates.
    Calls progress_cb(percent: int) periodically.
    Raises RuntimeError on non-zero exit.
    """
    log.debug("FFmpeg command: %s", " ".join(cmd))

    process = subprocess.Popen(
        cmd,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )

    time_pattern = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")

    stderr_lines: list[str] = []
    assert process.stderr is not None
    for line in process.stderr:
        stderr_lines.append(line.rstrip())
        log.debug("ffmpeg: %s", line.rstrip())
        match = time_pattern.search(line)
        if match and progress_cb and audio_duration > 0:
            h, m, s = match.groups()
            elapsed = int(h) * 3600 + int(m) * 60 + float(s)
            pct = min(95, int(elapsed / audio_duration * 100))
            progress_cb(pct)

    process.wait()
    if process.returncode != 0:
        # Log the last 40 lines of stderr so the cause is visible in server logs
        tail = "\n".join(stderr_lines[-40:])
        log.error("FFmpeg failed (code %d):\n%s", process.returncode, tail)
        raise RuntimeError(
            f"FFmpeg exited with code {process.returncode}. "
            f"Last error output:\n{tail}"
        )


# ── Main render command builder ────────────────────────────────────────────────

def build_ffmpeg_command(
    *,
    audio_path: str | Path,
    image_path: Optional[str | Path],
    video_loop_path: Optional[str | Path],
    output_path: str | Path,
    filter_complex: str,
    out_label: str,
    audio_duration: float,
    quality: str,
) -> list[str]:
    """Assemble the complete FFmpeg invocation."""
    q = QUALITY_PRESETS[quality]
    crf = q["crf"]
    preset = q["preset"]

    cmd: list[str] = [FFMPEG_PATH, "-y"]

    if video_loop_path:
        # Loop the video clip for the entire song duration
        cmd += ["-stream_loop", "-1", "-i", str(video_loop_path)]
    else:
        # Single still image — loop it
        cmd += ["-loop", "1", "-i", str(image_path)]

    cmd += ["-i", str(audio_path)]

    cmd += [
        "-filter_complex", filter_complex,
        "-map", f"[{out_label}]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-c:a", "aac",
        "-b:a", "320k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
    ]

    # Stop when the audio track ends (handles both loop and static image cases)
    if video_loop_path:
        cmd += ["-shortest"]
    else:
        cmd += ["-t", str(audio_duration)]

    cmd.append(str(output_path))
    return cmd
