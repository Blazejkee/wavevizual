import type { DrawFn } from './types'
import { applyGlow, getWaveSamples, hexToRgba } from './types'

export const drawNeon: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { primaryColor, secondaryColor, opacity, glow, sensitivity,
          posX, posY, scale, mirror } = viz

  const cx     = W * (posX / 100)
  const cy     = H * (posY / 100)
  const waveW  = W * 0.88 * scale
  const waveH  = H * 0.28 * scale
  const startX = cx - waveW / 2

  const layers = [
    { offset: 0,    colFrac: 0,   blur: glow,       alpha: opacity,       width: 2.5 },
    { offset: 0.08, colFrac: 0.4, blur: glow * 0.7, alpha: opacity * 0.5, width: 1.5 },
    { offset: -0.1, colFrac: 0.7, blur: glow * 0.5, alpha: opacity * 0.35, width: 1.5 },
    { offset: 0.18, colFrac: 1,   blur: glow * 0.3, alpha: opacity * 0.2, width: 1 },
  ]

  ctx.save()

  for (const layer of layers) {
    const samples = getWaveSamples(audio, 400, t + layer.offset * 2)
    const r = Math.round(
      parseInt(primaryColor.slice(1, 3), 16) * (1 - layer.colFrac) +
      parseInt(secondaryColor.slice(1, 3), 16) * layer.colFrac
    )
    const g = Math.round(
      parseInt(primaryColor.slice(3, 5), 16) * (1 - layer.colFrac) +
      parseInt(secondaryColor.slice(3, 5), 16) * layer.colFrac
    )
    const b = Math.round(
      parseInt(primaryColor.slice(5, 7), 16) * (1 - layer.colFrac) +
      parseInt(secondaryColor.slice(5, 7), 16) * layer.colFrac
    )
    const color = `rgba(${r},${g},${b},${layer.alpha})`

    ctx.strokeStyle = color
    ctx.lineWidth   = layer.width
    applyGlow(ctx, `rgb(${r},${g},${b})`, layer.blur)

    const renderLine = (flip: boolean) => {
      ctx.beginPath()
      for (let i = 0; i < samples.length; i++) {
        const x   = startX + (i / (samples.length - 1)) * waveW
        const raw = samples[i] * sensitivity + layer.offset * 0.3
        const y   = cy + (flip ? -raw : raw) * waveH * 0.45
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    renderLine(false)
    if (mirror) {
      ctx.globalAlpha = 0.4
      renderLine(true)
      ctx.globalAlpha = 1
    }
  }

  // Center spine glow
  ctx.strokeStyle = hexToRgba(primaryColor, opacity * 0.15)
  ctx.lineWidth   = 1
  ctx.shadowBlur  = 0
  ctx.setLineDash([4, 8])
  ctx.beginPath()
  ctx.moveTo(startX, cy)
  ctx.lineTo(startX + waveW, cy)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}
