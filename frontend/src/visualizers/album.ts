import type { DrawFn } from './types'
import { makeGradient, applyGlow, getFreqBars, hexToRgba } from './types'

export const drawAlbum: DrawFn = ({ ctx, W, H, t, audio, viz, coverImg }) => {
  const { barCount, colorMode, primaryColor, secondaryColor, opacity,
          glow, sensitivity, bassBoost, posX, posY, scale } = viz

  const cx   = W * (posX / 100)
  const cy   = H * (posY / 100)
  const base = Math.min(W, H)
  const rad  = base * 0.18 * scale
  const bars = getFreqBars(audio, barCount, t, sensitivity, bassBoost)

  ctx.save()

  // Circular frequency bars around the album art
  const outerRad = rad * 1.65
  applyGlow(ctx, primaryColor, glow)

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2 + t * 0.15
    const mag   = bars[i]
    const ext   = mag * rad * 0.8 + 3

    const x0 = cx + outerRad * Math.cos(angle)
    const y0 = cy + outerRad * Math.sin(angle)
    const x1 = cx + (outerRad + ext) * Math.cos(angle)
    const y1 = cy + (outerRad + ext) * Math.sin(angle)

    const color = colorMode === 'solid'
      ? hexToRgba(primaryColor, opacity)
      : colorMode === 'rainbow'
        ? `hsla(${(i / barCount) * 360},90%,65%,${opacity})`
        : makeGradient(ctx, x0, y0, x1, y1, primaryColor, secondaryColor, opacity)

    ctx.strokeStyle = color
    ctx.lineWidth   = Math.max(1.5, viz.barWidth * 0.4)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }

  // Glow ring behind album art
  ctx.shadowBlur = 0
  const ringGrad = ctx.createRadialGradient(cx, cy, rad * 0.9, cx, cy, rad * 1.4)
  ringGrad.addColorStop(0, hexToRgba(primaryColor, opacity * 0.35))
  ringGrad.addColorStop(1, hexToRgba(primaryColor, 0))
  ctx.fillStyle = ringGrad
  ctx.beginPath()
  ctx.arc(cx, cy, rad * 1.4, 0, Math.PI * 2)
  ctx.fill()

  // Album art circle clip
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.clip()

  if (coverImg && coverImg.complete) {
    ctx.drawImage(coverImg, cx - rad, cy - rad, rad * 2, rad * 2)
  } else {
    // Placeholder gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#0d0d1a')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.fillStyle = hexToRgba(primaryColor, 0.2)
    ctx.font = `${rad * 0.6}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('♪', cx, cy)
  }

  ctx.restore()

  // Border ring
  ctx.strokeStyle = hexToRgba(primaryColor, opacity * 0.5)
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}
