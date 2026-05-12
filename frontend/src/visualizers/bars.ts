import type { DrawFn } from './types'
import { makeGradient, applyGlow, getFreqBars, hexToRgba } from './types'

export const drawBars: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { barCount, barWidth, barGap, roundness, mirror, glow,
          primaryColor, secondaryColor, colorMode, opacity,
          sensitivity, bassBoost, posX, posY, scale } = viz

  const bars = getFreqBars(audio, barCount, t, sensitivity, bassBoost)

  // Total group width scales with the canvas, controlled by `scale`.
  // barWidth and barGap are treated as a fill ratio so they're canvas-independent.
  const groupW   = Math.min(W * 0.99, W * scale)
  const slotW    = groupW / barCount
  // fillRatio: what fraction of each slot is bar vs gap (barGap=0 → solid, high barGap → thin bars)
  const fillRatio = barWidth / (barWidth + Math.max(0.01, barGap))
  const actualBarW = Math.max(1, slotW * fillRatio)

  const cx     = W * (posX / 100)
  const maxH   = H * 0.45 * scale
  const startX = cx - groupW / 2
  const baseY  = H * (posY / 100)

  ctx.save()

  for (let i = 0; i < barCount; i++) {
    const mag  = bars[i]
    const barH = Math.max(2, mag * maxH)
    const x    = startX + i * slotW + (slotW - actualBarW) / 2   // centered in slot

    const grad = colorMode === 'solid'
      ? hexToRgba(primaryColor, opacity)
      : colorMode === 'rainbow'
        ? `hsla(${(i / barCount) * 360},90%,65%,${opacity})`
        : makeGradient(ctx, 0, baseY, 0, baseY - maxH, secondaryColor, primaryColor, opacity)

    ctx.fillStyle = grad
    applyGlow(ctx, primaryColor, glow)

    const r = Math.min(roundness, actualBarW / 2, barH / 2)

    if (mirror) {
      drawRoundedBar(ctx, x, baseY - barH, actualBarW, barH, r, true)
      ctx.globalAlpha = 0.45
      drawRoundedBar(ctx, x, baseY, actualBarW, barH, r, false)
      ctx.globalAlpha = 1
    } else {
      drawRoundedBar(ctx, x, baseY - barH, actualBarW, barH, r, true)
    }
  }

  ctx.restore()
}

function drawRoundedBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number, roundTop: boolean,
) {
  if (!roundTop || r <= 0) {
    ctx.fillRect(x, y, w, h)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}
