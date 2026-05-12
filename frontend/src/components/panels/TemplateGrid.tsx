import React, { useRef, useEffect } from 'react'
import { useProjectStore, type TemplateId } from '../../store/useProjectStore'
import { renderFrame } from '../../visualizers/renderer'

interface Template {
  id: TemplateId
  label: string
  icon: string
  desc: string
}

const TEMPLATES: Template[] = [
  { id: 'bars',     label: 'Spectrum Bars',   icon: '▮▮▮', desc: 'Frequency bars' },
  { id: 'circular', label: 'Circular Ring',   icon: '◎',   desc: 'Ring of bars' },
  { id: 'wave',     label: 'Smooth Wave',     icon: '〜',   desc: 'Flowing waveform' },
  { id: 'dual',     label: 'Dual Stereo',     icon: '⇆',   desc: 'L/R channels' },
  { id: 'radial',   label: 'Radial Pulse',    icon: '◉',   desc: 'Bass pulse rings' },
  { id: 'album',    label: 'Album Cover',     icon: '♬',   desc: 'Art + ring' },
  { id: 'neon',     label: 'Neon Lines',      icon: '⟿',   desc: 'Glowing waves' },
]

export default function TemplateGrid() {
  const { viz, setTemplate } = useProjectStore()

  return (
    <div className="panel-section">
      <div className="section-title">Visualizer Style</div>
      <div className="template-grid">
        {TEMPLATES.map(tpl => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            active={viz.template === tpl.id}
            onClick={() => setTemplate(tpl.id)}
            viz={viz}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({ tpl, active, onClick, viz }: { tpl: Template; active: boolean; onClick: () => void; viz: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const t0Ref     = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = 120, H = 68

    function frame(ts: number) {
      if (t0Ref.current === null) t0Ref.current = ts
      const t = (ts - t0Ref.current) / 1000
      ctx.clearRect(0, 0, W, H)

      // Dark background for the card
      ctx.fillStyle = '#0d0d1a'
      ctx.fillRect(0, 0, W, H)

      renderFrame({
        ctx, W, H, t,
        audio: null,
        isPlaying: false,
        viz: { ...viz, template: tpl.id, posX: 50, posY: 75, scale: 0.75, barCount: 32, glow: 10 },
        bg: { file: null, type: null, url: null, effect: 'none', darken: 0, vignette: false, blur: 0 },
        textLayers: [],
        showTextOverlay: false,
        bgImg: null, bgVideo: null, coverImg: null, bgZoom: 1,
      })

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafRef.current); t0Ref.current = null }
  }, [tpl.id, viz.primaryColor, viz.secondaryColor, viz.colorMode])

  return (
    <div
      className={`template-card${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} width={120} height={68} className="template-canvas" />
      <div className="template-label">{tpl.label}</div>
    </div>
  )
}
