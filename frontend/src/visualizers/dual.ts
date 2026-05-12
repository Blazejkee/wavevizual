import type { DrawFn } from './types'
import { applyGlow, getFreqBarsChannel, simFreq, hexToRgba, makeGradient } from './types'

export const drawDual: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { barCount, barWidth, barGap, roundness, glow,
          primaryColor, secondaryColor, colorMode, opacity,
          sensitivity, bassBoost, posX, posY, scale } = viz

  const n    = Math.floor(barCount / 2)
  const cx   = W * (posX / 100)
  const cy   = H * (posY / 100)
  const maxH = H * 0.4 * scale

  // Each side gets half the scaled canvas width
  const halfGroupW = (W * scale * 0.48)
  const slotW      = halfGroupW / n
  const fillRatio  = barWidth / (barWidth + Math.max(0.01, barGap))
  const actualBarW = Math.max(1, slotW * fillRatio)

  let barsL: Float32Array, barsR: Float32Array
  if (audio && audio.frequencyLeft.length) {
    barsL = getFreqBarsChannel(audio.frequencyLeft,  n, sensitivity * (1 + bassBoost * 0.15))
    barsR = getFreqBarsChannel(audio.frequencyRight, n, sensitivity * (1 + bassBoost * 0.15))
  } else {
    barsL = new Float32Array(n)
    barsR = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      barsL[i] = simFreq(i, n, t)
      barsR[i] = simFreq(n - 1 - i, n, t + 0.3)
    }
  }

  ctx.save()
  applyGlow(ctx, primaryColor, glow)

  const r        = Math.min(roundness, actualBarW / 2)
  const dividerGap = Math.max(4, slotW * 0.5)   // small gap between L and R sides

  // Left channel — bars extend left from center
  for (let i = 0; i < n; i++) {
    const barH = Math.max(2, barsL[n - 1 - i] * maxH)
    const x    = cx - dividerGap / 2 - (i + 1) * slotW + (slotW - actualBarW) / 2

    const color = colorMode === 'solid'
      ? hexToRgba(primaryColor, opacity)
      : colorMode === 'rainbow'
        ? `hsla(${(i / n) * 120 + 180},90%,65%,${opacity})`
        : makeGradient(ctx, x, cy, x + actualBarW, cy, primaryColor, secondaryColor, opacity)

    ctx.fillStyle = color
    drawBar(ctx, x, cy - barH / 2, actualBarW, barH, r)
  }

  // Right channel — bars extend right from center
  for (let i = 0; i < n; i++) {
    const barH = Math.max(2, barsR[i] * maxH)
    const x    = cx + dividerGap / 2 + i * slotW + (slotW - actualBarW) / 2

    const color = colorMode === 'solid'
      ? hexToRgba(secondaryColor, opacity)
      : colorMode === 'rainbow'
        ? `hsla(${(i / n) * 120 + 60},90%,65%,${opacity})`
        : makeGradient(ctx, x, cy, x + actualBarW, cy, secondaryColor, primaryColor, opacity)

    ctx.fillStyle = color
    drawBar(ctx, x, cy - barH / 2, actualBarW, barH, r)
  }

  // Center divider line
  ctx.strokeStyle = hexToRgba(primaryColor, opacity * 0.2)
  ctx.lineWidth   = 1
  ctx.shadowBlur  = 0
  ctx.beginPath()
  ctx.moveTo(cx, cy - maxH)
  ctx.lineTo(cx, cy + maxH)
  ctx.stroke()

  ctx.restore()
}

function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0 || h < r * 2) { ctx.fillRect(x, y, w, h); return }
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}
