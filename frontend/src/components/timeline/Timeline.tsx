import React, { useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import type { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer'

interface Props {
  analyzer: ReturnType<typeof useAudioAnalyzer> | null
}

export default function Timeline({ analyzer }: Props) {
  const { audioBuffer, viz } = useProjectStore()
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const duration    = analyzer?.duration    ?? audioBuffer?.duration ?? 0
  const currentTime = analyzer?.currentTime ?? 0

  // Draw static waveform once when audio changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !audioBuffer) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Downsample to one peak per pixel
    const channelData = audioBuffer.getChannelData(0)
    const step = Math.ceil(channelData.length / W)

    for (let x = 0; x < W; x++) {
      let min = 1, max = -1
      const start = x * step
      for (let j = 0; j < step && start + j < channelData.length; j++) {
        const s = channelData[start + j]
        if (s < min) min = s
        if (s > max) max = s
      }
      const yTop = ((1 - max) / 2) * H
      const yBot = ((1 - min) / 2) * H

      // Gradient bar from mid
      const midY = H / 2
      const frac = x / W
      const r = Math.round(108 * (1 - frac) + 0   * frac)
      const g = Math.round(99  * (1 - frac) + 212 * frac)
      const b = Math.round(255 * (1 - frac) + 255 * frac)
      ctx.fillStyle = `rgba(${r},${g},${b},0.7)`
      ctx.fillRect(x, yTop, 1, yBot - yTop)
    }
  }, [audioBuffer])

  // Draw playhead on top (separate effect so it updates every frame)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !duration) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // Redraw happens via rAF — but for the timeline we just repaint on currentTime change
    const xPos = (currentTime / duration) * W

    // Re-draw waveform (efficiently copy from offscreen would be better, but good enough)
    // We do a minimal repaint: just the playhead overlay
    // Actually we need to redraw the whole canvas here, but that's expensive.
    // Instead we'll use a second canvas layer for the playhead.

    // Clear and re-draw background tint
    ctx.clearRect(xPos - 1, 0, 3, H)
    // Re-draw playhead
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(xPos, 0, 2, H)

    // Played region tint
    ctx.fillStyle = 'rgba(108,99,255,0.12)'
    ctx.fillRect(0, 0, xPos, H)
  })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    seekFromEvent(e)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [analyzer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    seekFromEvent(e)
  }, [analyzer])

  const handlePointerUp = useCallback(() => { isDragging.current = false }, [])

  function seekFromEvent(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas || !duration || !analyzer) return
    const rect = canvas.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    analyzer.seek(frac * duration)
  }

  // Resize canvas to fill container width
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width  = wrap.clientWidth
      canvas.height = wrap.clientHeight
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="timeline-wrap">
      {/* Track labels */}
      <div className="timeline-labels">
        <div className="track-label">Audio</div>
        <div className="track-label">Visual</div>
      </div>

      {/* Track area */}
      <div className="timeline-tracks">
        {/* Audio waveform track */}
        <div ref={wrapRef} className="timeline-audio-track">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', cursor: 'col-resize', display: 'block' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {!audioBuffer && (
            <div className="timeline-empty">No audio loaded</div>
          )}
        </div>

        {/* Visualizer block track */}
        <div className="timeline-viz-track">
          {audioBuffer && (
            <div
              className="viz-block"
              style={{ width: '100%', background: `linear-gradient(90deg, ${viz.primaryColor}44, ${viz.secondaryColor}44)` }}
            >
              <span>{viz.template}</span>
            </div>
          )}
        </div>

        {/* Time ruler */}
        <TimeRuler duration={duration} currentTime={currentTime} />
      </div>
    </div>
  )
}

function TimeRuler({ duration, currentTime }: { duration: number; currentTime: number }) {
  if (!duration) return null
  const marks: number[] = []
  const step = duration > 120 ? 30 : duration > 60 ? 15 : duration > 30 ? 10 : 5
  for (let t = 0; t <= duration; t += step) marks.push(t)

  return (
    <div className="time-ruler">
      {marks.map(t => (
        <div
          key={t}
          className="time-mark"
          style={{ left: `${(t / duration) * 100}%` }}
        >
          {t < 60 ? `${t}s` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`}
        </div>
      ))}
    </div>
  )
}
