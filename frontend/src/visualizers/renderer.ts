import type { DrawContext } from './types'
import type { TemplateId, VisualizerConfig, BackgroundConfig, TextLayer } from '../store/useProjectStore'
import type { AudioAnalysisData } from '../hooks/useAudioAnalyzer'
import { drawBars }     from './bars'
import { drawCircular } from './circular'
import { drawWave }     from './wave'
import { drawDual }     from './dual'
import { drawRadial }   from './radial'
import { drawAlbum }    from './album'
import { drawNeon }     from './neon'

const DRAW_MAP: Record<TemplateId, (dc: DrawContext) => void> = {
  bars:     drawBars,
  circular: drawCircular,
  wave:     drawWave,
  dual:     drawDual,
  radial:   drawRadial,
  album:    drawAlbum,
  neon:     drawNeon,
}

interface RenderArgs {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  t: number
  audio: AudioAnalysisData | null
  isPlaying: boolean
  viz: VisualizerConfig
  bg: BackgroundConfig
  textLayers: TextLayer[]
  showTextOverlay: boolean
  bgImg: HTMLImageElement | null
  bgVideo: HTMLVideoElement | null
  coverImg: HTMLImageElement | null
  bgZoom: number     // animated zoom factor for bg
}

export function renderFrame(args: RenderArgs) {
  const { ctx, W, H, t, audio, isPlaying, viz, bg, textLayers, showTextOverlay,
          bgImg, bgVideo, coverImg, bgZoom } = args

  ctx.clearRect(0, 0, W, H)

  // ── 1. Background ────────────────────────────────────────────────────────────
  if (bgImg || bgVideo) {
    const src = bgVideo ?? bgImg!
    const bass = audio ? audio.bass : 0.5 + 0.3 * Math.sin(t * 1.5)
    let zoom = bgZoom

    if (bg.effect === 'pulse') {
      zoom = 1 + bass * 0.06
    }

    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-W / 2, -H / 2)
    if (bg.blur > 0) ctx.filter = `blur(${bg.blur}px)`

    // Object-cover scale
    const scaleW = W / (src as HTMLImageElement).naturalWidth  || W / 1920
    const scaleH = H / (src as HTMLImageElement).naturalHeight || H / 1080
    const s = Math.max(scaleW, scaleH) || 1
    const dw = (src as HTMLImageElement).naturalWidth  ? (src as HTMLImageElement).naturalWidth  * s : W
    const dh = (src as HTMLImageElement).naturalHeight ? (src as HTMLImageElement).naturalHeight * s : H
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh)
    ctx.restore()
    ctx.filter = 'none'
  } else {
    // Default gradient background
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#080812')
    grad.addColorStop(1, '#0d0d20')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Darken overlay ────────────────────────────────────────────────────────
  if (bg.darken > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bg.darken})`
    ctx.fillRect(0, 0, W, H)
  }

  // ── 3. Vignette ──────────────────────────────────────────────────────────────
  if (bg.vignette) {
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.65)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)
  }

  // ── 4. Visualizer ─────────────────────────────────────────────────────────────
  const dc: DrawContext = { ctx, W, H, t, audio, viz, coverImg, isPlaying }
  DRAW_MAP[viz.template](dc)

  // ── 5. Text overlays ──────────────────────────────────────────────────────────
  if (showTextOverlay) {
    for (const layer of textLayers) {
      if (!layer.enabled || !layer.text) continue
      renderText(ctx, layer, W, H)
    }
  }
}

function renderText(ctx: CanvasRenderingContext2D, layer: TextLayer, W: number, H: number) {
  ctx.save()

  const x = W * (layer.x / 100)
  const y = H * (layer.y / 100)

  ctx.font = `${layer.fontWeight} ${layer.fontSize}px -apple-system, "Inter", sans-serif`
  ctx.textAlign = layer.align as CanvasTextAlign
  ctx.textBaseline = 'top'
  ctx.letterSpacing = `${layer.letterSpacing}px`
  ctx.globalAlpha = layer.opacity

  if (layer.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur  = 14
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
  }

  if (layer.glow) {
    ctx.shadowColor = layer.color
    ctx.shadowBlur  = 20
  }

  ctx.fillStyle = layer.color
  ctx.fillText(layer.text, x, y)

  ctx.restore()
}

// ── Template-to-backend mapping ────────────────────────────────────────────────
export const TEMPLATE_TO_BACKEND: Record<TemplateId, string> = {
  bars:     'bars',
  circular: 'circular',
  wave:     'line',
  dual:     'dual',
  radial:   'circular',
  album:    'circular',
  neon:     'line',
}
