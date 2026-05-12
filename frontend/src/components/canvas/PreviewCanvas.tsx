import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer'
import { renderFrame } from '../../visualizers/renderer'

const ASPECT: Record<string, number> = { youtube: 16 / 9, square: 1, shorts: 9 / 16 }

interface Props {
  onAnalyzerReady?: (analyzer: ReturnType<typeof useAudioAnalyzer>) => void
}

interface DragState {
  active: boolean
  startClientX: number
  startClientY: number
  startPosX: number
  startPosY: number
}

export default function PreviewCanvas({ onAnalyzerReady }: Props) {
  const { viz, background, textLayers, showTextOverlay, exportConfig, audioBuffer, setViz } =
    useProjectStore()

  const analyzer = useAudioAnalyzer(audioBuffer, viz.smoothing)

  const prevReadyRef = useRef(false)
  useEffect(() => {
    if (!prevReadyRef.current && onAnalyzerReady) {
      onAnalyzerReady(analyzer)
      prevReadyRef.current = true
    }
  }, [analyzer, onAnalyzerReady])

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const bgImgRef    = useRef<HTMLImageElement | null>(null)
  const bgVideoRef  = useRef<HTMLVideoElement | null>(null)
  const coverImgRef = useRef<HTMLImageElement | null>(null)
  const bgZoomRef   = useRef(1.0)

  const analyzerRef     = useRef(analyzer)
  analyzerRef.current   = analyzer
  const vizRef          = useRef(viz)
  vizRef.current        = viz
  const backgroundRef   = useRef(background)
  backgroundRef.current = background
  const textLayersRef   = useRef(textLayers)
  textLayersRef.current = textLayers
  const showTextRef     = useRef(showTextOverlay)
  showTextRef.current   = showTextOverlay

  // ── Drag state ────────────────────────────────────────────────────────────────
  const dragRef = useRef<DragState>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startPosX: 0,
    startPosY: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos]       = useState({ x: 50, y: 80 })

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: vizRef.current.posX,
      startPosY: vizRef.current.posY,
    }
    setIsDragging(true)
    setDragPos({ x: Math.round(vizRef.current.posX), y: Math.round(vizRef.current.posY) })
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - dragRef.current.startClientX) / rect.width  * 100
    const dy = (e.clientY - dragRef.current.startClientY) / rect.height * 100
    const newX = Math.max(0, Math.min(100, dragRef.current.startPosX + dx))
    const newY = Math.max(0, Math.min(100, dragRef.current.startPosY + dy))
    setViz({ posX: newX, posY: newY })
    setDragPos({ x: Math.round(newX), y: Math.round(newY) })
  }, [setViz])

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false
    setIsDragging(false)
  }, [])

  // ── Media loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!background.file || !background.url) {
      bgImgRef.current   = null
      bgVideoRef.current = null
      return
    }
    if (background.type === 'image') {
      const img = new Image()
      img.onload = () => { bgImgRef.current = img }
      img.src = background.url
    } else if (background.type === 'video') {
      const vid = document.createElement('video')
      vid.src = background.url
      vid.loop = true
      vid.muted = true
      vid.playsInline = true
      vid.play().catch(() => {})
      bgVideoRef.current = vid
    }
    return () => { bgVideoRef.current?.pause() }
  }, [background.url, background.type])

  useEffect(() => {
    if (background.type === 'image' && background.url) {
      const img = new Image()
      img.onload = () => { coverImgRef.current = img }
      img.src = background.url
    }
  }, [background.url, background.type])

  // ── Resize observer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (canvasRef.current) {
        canvasRef.current.width  = w
        canvasRef.current.height = h
      }
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // ── Animation loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let frameId: number
    let t0 = 0

    function frame(ts: number) {
      if (!t0) t0 = ts
      const elapsed = (ts - t0) / 1000
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) { frameId = requestAnimationFrame(frame); return }

      const bg = backgroundRef.current
      bgZoomRef.current = bg.effect === 'slow-zoom' ? 1 + (elapsed * 0.002) % 0.15 : 1

      const az = analyzerRef.current
      renderFrame({
        ctx, W, H, t: elapsed,
        audio: az.isPlayingRef.current ? az.audioDataRef.current : null,
        isPlaying: az.isPlayingRef.current,
        viz: vizRef.current,
        bg,
        textLayers: textLayersRef.current,
        showTextOverlay: showTextRef.current,
        bgImg:    bgImgRef.current,
        bgVideo:  bgVideoRef.current,
        coverImg: coverImgRef.current,
        bgZoom:   bgZoomRef.current,
      })

      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameId)
  }, [])

  const ar = ASPECT[exportConfig.format] ?? (16 / 9)

  return (
    <div className="preview-outer" style={{ paddingBottom: `${(1 / ar) * 100}%` }}>
      <div ref={wrapRef} className="preview-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        />

        {/* Position readout while dragging */}
        {isDragging && (
          <div style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '5px 14px', fontSize: 12,
            color: '#fff', fontFamily: 'monospace', pointerEvents: 'none',
            whiteSpace: 'nowrap', zIndex: 10,
          }}>
            X: {dragPos.x}% &nbsp; Y: {dragPos.y}%
          </div>
        )}

        {/* Drag hint — shows briefly on hover when not dragging */}
        {!isDragging && (audioBuffer || background.file) && (
          <div style={{
            position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)', borderRadius: 7, padding: '4px 12px',
            fontSize: 11, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
            whiteSpace: 'nowrap', zIndex: 10, opacity: 0,
            transition: 'opacity 0.2s',
          }}
          className="drag-hint">
            drag to reposition
          </div>
        )}

        {/* Empty state */}
        {!audioBuffer && !background.file && (
          <div className="preview-empty">
            <div className="preview-empty-icon">🎬</div>
            <div className="preview-empty-text">Upload audio & background to preview</div>
          </div>
        )}

        {/* Badges */}
        <div className="preview-badge">PREVIEW</div>
        <div className="preview-format">{exportConfig.format.toUpperCase()}</div>
      </div>
    </div>
  )
}
