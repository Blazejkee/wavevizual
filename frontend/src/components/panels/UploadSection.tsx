import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'

// ── Audio Upload ───────────────────────────────────────────────────────────────

export function AudioUpload() {
  const { audioFile, audioBuffer, audioName, setAudio, clearAudio } = useProjectStore()
  const [drag, setDrag] = useState(false)
  const waveCanvasRef = useRef<HTMLCanvasElement>(null)

  // Draw mini waveform when audio loads
  useEffect(() => {
    const canvas = waveCanvasRef.current
    if (!canvas || !audioBuffer) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / W)
    for (let x = 0; x < W; x++) {
      let max = 0
      const start = x * step
      for (let j = 0; j < step; j++) {
        const abs = Math.abs(data[start + j] || 0)
        if (abs > max) max = abs
      }
      const barH = max * (H / 2)
      ctx.fillStyle = 'rgba(108,99,255,0.8)'
      ctx.fillRect(x, H / 2 - barH, 1, barH * 2)
    }
  }, [audioBuffer])

  async function loadFile(file: File) {
    try {
      const ab  = await file.arrayBuffer()
      const ac  = new AudioContext()
      const buf = await ac.decodeAudioData(ab)
      await ac.close()
      setAudio(file, buf)
    } catch {
      alert('Could not decode audio file. Please use MP3, WAV, or M4A.')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) loadFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) loadFile(f)
  }

  return (
    <div className="panel-section">
      <div className="section-title">Audio</div>
      <div
        className={`upload-zone${audioFile ? ' has-file' : ''}${drag ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <input type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg" onChange={onFileChange} />
        {audioFile ? (
          <div className="audio-loaded">
            <div className="audio-icon">♪</div>
            <div className="audio-info">
              <div className="audio-name">{audioName || audioFile.name}</div>
              <div className="audio-dur">{audioBuffer ? formatDur(audioBuffer.duration) : ''}</div>
            </div>
            <canvas ref={waveCanvasRef} width={120} height={36} className="mini-waveform" />
            <button className="clear-btn" onClick={e => { e.stopPropagation(); clearAudio() }}>✕</button>
          </div>
        ) : (
          <>
            <span className="zone-icon">🎵</span>
            <span className="zone-label">Drop audio file</span>
            <span className="zone-hint">MP3 · WAV · M4A · FLAC</span>
          </>
        )}
      </div>
    </div>
  )
}

function formatDur(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Background Upload ──────────────────────────────────────────────────────────

export function BackgroundUpload() {
  const { background, setBackground } = useProjectStore()
  const [drag, setDrag] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  async function loadFile(file: File) {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    const url = URL.createObjectURL(file)
    prevUrlRef.current = url
    const type = file.type.startsWith('video') ? 'video' : 'image'
    setBackground({ file, type, url })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) loadFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) loadFile(f)
  }

  const hasFile = !!background.file

  return (
    <div className="panel-section">
      <div className="section-title">Background</div>
      <div
        className={`upload-zone${hasFile ? ' has-file' : ''}${drag ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ minHeight: 90 }}
      >
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={onFileChange} />
        {hasFile ? (
          <div className="bg-loaded">
            {background.type === 'image' && background.url && (
              <img src={background.url} className="bg-thumb" alt="" />
            )}
            {background.type === 'video' && (
              <div className="bg-thumb-video">▶ Video</div>
            )}
            <div className="bg-info">
              <div className="bg-name">{background.file!.name}</div>
              <div className="bg-type">{background.type === 'video' ? 'Video Loop' : 'Static Image'}</div>
            </div>
            <button
              className="clear-btn"
              onClick={e => { e.stopPropagation(); setBackground({ file: null, type: null, url: null }) }}
            >✕</button>
          </div>
        ) : (
          <>
            <span className="zone-icon">🖼</span>
            <span className="zone-label">Drop image or video</span>
            <span className="zone-hint">JPG · PNG · WEBP · MP4 · MOV</span>
          </>
        )}
      </div>

      {hasFile && (
        <div className="bg-options">
          <div className="prop-label" style={{ marginBottom: 6 }}>Background effect</div>
          <div className="pill-group">
            {(['none', 'slow-zoom', 'pulse', 'parallax'] as const).map(e => (
              <button
                key={e}
                type="button"
                className={`pill${background.effect === e ? ' active' : ''}`}
                onClick={() => setBackground({ effect: e })}
              >
                {e === 'none' ? 'None' : e === 'slow-zoom' ? 'Slow Zoom' : e === 'pulse' ? 'Pulse' : 'Parallax'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
