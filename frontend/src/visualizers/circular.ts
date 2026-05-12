import type { DrawFn } from './types'
import { makeGradient, applyGlow, getFreqBars, hexToRgba } from './types'

export const drawCircular: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { barCount, colorMode, primaryColor, secondaryColor, opacity,
          glow, sensitivity, bassBoost, posX, posY, scale, mirror } = viz

  const bars  = getFreqBars(audio, barCount, t, sensitivity, bassBoost)
  const cx    = W * (posX / 100)
  const cy    = H * (posY / 100)
  const rad   = Math.min(W, H) * 0.22 * scale
  const maxExt = rad * 0.75

  ctx.save()
  applyGlow(ctx, primaryColor, glow)

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
    const mag   = bars[i]
    const ext   = mag * maxExt

    const x0 = cx + rad * Math.cos(angle)
    const y0 = cy + rad * Math.sin(angle)
    const x1 = cx + (rad + ext) * Math.cos(angle)
    const y1 = cy + (rad + ext) * Math.sin(angle)

    const color = colorMode === 'solid'
      ? hexToRgba(primaryColor, opacity)
      : colorMode === 'rainbow'
        ? `hsla(${(i / barCount) * 360},90%,65%,${opacity})`
        : makeGradient(ctx, x0, y0, x1, y1, primaryColor, secondaryColor, opacity)

    ctx.strokeStyle = color
    ctx.lineWidth   = Math.max(2, viz.barWidth * 0.5)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()

    if (mirror) {
      const xm = cx + (rad - ext * 0.6) * Math.cos(angle)
      const ym = cy + (rad - ext * 0.6) * Math.sin(angle)
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(xm, ym)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // Inner ring
  ctx.strokeStyle = hexToRgba(primaryColor, opacity * 0.25)
  ctx.lineWidth   = 1
  ctx.shadowBlur  = 0
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}
