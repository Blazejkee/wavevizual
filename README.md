# WaveVizual — Music Visualizer

Generate YouTube-ready music visualizer MP4 videos from an audio file + cover image (or a video loop background).

```
Stack: React + Vite + TypeScript (frontend) · FastAPI + Python + FFmpeg (backend)
```

---

## Features

| Feature | Details |
|---|---|
| Background | Video loop (looped) or cover image with cinematic zoompan |
| Waveform styles | Line · Bars (spectrum) · Circular (vectorscope) · Minimal |
| Waveform positions | Bottom · Center · Top |
| Formats | YouTube 16:9 · Shorts/TikTok 9:16 · Instagram 1:1 |
| Quality | 1080p (CRF 20) · 4K (CRF 18) |
| Audio | AAC 320 kbps |
| Video codec | H.264 (libx264) · yuv420p · faststart |
| Text overlay | Song title + artist with drop shadow |

---

## Quick Start — Local (recommended for dev)

### 1. Install FFmpeg

**macOS (Homebrew)**
```bash
brew install ffmpeg
```

**Ubuntu / Debian**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

**Windows**
Download from https://ffmpeg.org/download.html, extract, and add `bin/` to your `PATH`.  
Or via Chocolatey: `choco install ffmpeg`

Verify:
```bash
ffmpeg -version
ffprobe -version
```

---

### 2. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

API available at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

---

### 3. Frontend

```bash
cd frontend

npm install
npm run dev
```

App available at: http://localhost:3000

---

## Quick Start — Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000

---

## API Reference

### POST /api/jobs/create

Create a render job. Accepts `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `audio` | file | ✅ | MP3 or WAV, max 300 MB |
| `cover_image` | file | ✅ | JPG or PNG, max 50 MB |
| `video_loop` | file | — | MP4/MOV/WebM, max 1 GB |
| `song_title` | string | — | Shown on video |
| `artist_name` | string | — | Shown on video |
| `output_format` | string | — | `youtube` · `shorts` · `instagram` |
| `waveform_style` | string | — | `line` · `bars` · `circular` · `minimal` |
| `waveform_position` | string | — | `bottom` · `center` · `top` |
| `show_title` | bool | — | Default `true` |
| `slow_zoom` | bool | — | Default `true` (image backgrounds only) |
| `quality` | string | — | `1080p` · `4k` |

**Response:** `202 Accepted` with job object.

---

### GET /api/jobs/{job_id}

Poll job status.

```json
{
  "id": "uuid",
  "status": "queued | rendering | completed | failed",
  "progress": 72,
  "created_at": "2026-05-10T12:00:00Z",
  "completed_at": null,
  "error": null,
  "settings": { ... },
  "download_url": "/api/jobs/{id}/download"
}
```

---

### GET /api/jobs/{job_id}/download

Download the finished MP4.

---

### GET /api/jobs

List the 20 most recent jobs.

---

## Example cURL Commands

```bash
# 1. Create a job with cover image + line waveform
curl -X POST http://localhost:8000/api/jobs/create \
  -F "audio=@/path/to/song.mp3" \
  -F "cover_image=@/path/to/cover.jpg" \
  -F "song_title=Midnight Dreams" \
  -F "artist_name=Nova Collective" \
  -F "output_format=youtube" \
  -F "waveform_style=line" \
  -F "waveform_position=bottom" \
  -F "quality=1080p" \
  -F "show_title=true" \
  -F "slow_zoom=true"

# 2. Poll status (replace JOB_ID)
curl http://localhost:8000/api/jobs/JOB_ID

# 3. Download when completed
curl -L http://localhost:8000/api/jobs/JOB_ID/download -o output.mp4

# 4. Video loop background + bars + 4K
curl -X POST http://localhost:8000/api/jobs/create \
  -F "audio=@song.mp3" \
  -F "cover_image=@cover.jpg" \
  -F "video_loop=@loop.mp4" \
  -F "output_format=shorts" \
  -F "waveform_style=bars" \
  -F "quality=4k"

# 5. List recent jobs
curl http://localhost:8000/api/jobs
```

---

## FFmpeg Filter Logic

### Image background (zoompan)
```
[image] → scale 2× → zoompan (slow zoom) → [bg]
[audio] → showwaves/showfreqs/avectorscope → colorkey (transparent bg) → [waves]
[bg][waves] → overlay → [vid]
[vid] → drawtext (title) → drawtext (artist) → [out]
```

### Video loop background
```
[video, -stream_loop -1] → scale + crop → [bg]
[audio] → waveform filter → transparent overlay → [waves]
[bg][waves] → overlay → text → [out]
         ↑ stops via -shortest when audio ends
```

---

## File Structure

```
wavevizual/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── config.py         # Paths, limits, resolution map
│   │   ├── models.py         # Pydantic models + in-memory job store
│   │   ├── routes/
│   │   │   └── jobs.py       # POST create, GET status, GET download, GET list
│   │   ├── services/
│   │   │   ├── ffmpeg.py     # Filter builder, FFprobe, FFmpeg runner
│   │   │   ├── renderer.py   # Orchestrates full render pipeline
│   │   │   └── storage.py    # File I/O helpers
│   │   └── utils/
│   │       └── validation.py # MIME detection, size limits, text sanitisation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts     # Axios wrapper + TypeScript types
│   │   ├── components/
│   │   │   ├── UploadForm.tsx      # Drag-and-drop upload + settings
│   │   │   ├── RenderProgress.tsx  # Polling progress + download card
│   │   │   └── JobList.tsx         # Recent jobs sidebar
│   │   └── styles/app.css    # Dark glassmorphism theme
│   ├── vite.config.ts
│   └── Dockerfile
├── storage/
│   ├── uploads/              # Per-job upload directories
│   └── outputs/              # Per-job output MP4 files
├── docker-compose.yml
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `FFmpeg not found` | Install FFmpeg and ensure it's in your PATH |
| Render fails with filter error | Check backend logs for the exact FFmpeg command |
| `showfreqs` not available | Some builds lack it — switch waveform to `line` or `minimal` |
| Zoompan produces black frames | The cover image may be too small; use at least 1000×1000 px |
| 4K render is very slow | Expected — use 1080p for quick previews |
| Text not showing | Ensure a TrueType font is installed; see `find_system_font()` in `ffmpeg.py` |

---

## TODO — Future SaaS Features

```python
# 1. User accounts
#    - PostgreSQL + SQLAlchemy
#    - JWT auth (FastAPI Users)
#    - Per-user job history

# 2. Stripe payments
#    - Free tier: 1080p, watermark
#    - Pro tier: 4K, no watermark, priority queue
#    - stripe.checkout.Session for one-time or subscription

# 3. Cloud storage
#    - AWS S3 / Cloudflare R2 for uploads + outputs
#    - Pre-signed URLs for direct browser upload (bypass server)
#    - Lifecycle rules to auto-delete old files

# 4. Redis + Celery render queue
#    - Replace ThreadPoolExecutor with Celery workers
#    - Horizontal scaling: multiple render machines
#    - Priority queues (paid users first)

# 5. Preset templates
#    - "Lo-fi Chill", "EDM Drop", "Podcast", "Cinematic"
#    - Save custom presets per user

# 6. Free-tier watermark
#    - drawtext overlay in bottom-right corner
#    - Removed for paid users

# 7. Waveform color customisation
#    - Color picker in UI
#    - Gradient support via geq filter

# 8. Preview frame
#    - Extract a single frame before full render
#    - FFmpeg -vframes 1 at mid-point for instant preview

# 9. Usage analytics
#    - PostHog / Mixpanel for funnel tracking
#    - Track format, style, quality distribution
```
