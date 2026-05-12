import type { DrawFn } from './types'
import { makeGradient, applyGlow, getWaveSamples, hexToRgba } from './types'

export const drawWave: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { colorMode, primaryColor, secondaryColor, opacity,
          glow, sensitivity, posX, posY, scale, mirror } = viz

  const samples  = getWaveSamples(audio, 512, t)
  const cx       = W * (posX / 100)
  const cy       = H * (posY / 100)
  const waveW    = W * 0.9 * scale
  const waveH    = H * 0.30 * scale
  const startX   = cx - waveW / 2

  ctx.save()
  applyGlow(ctx, primaryColor, glow)

  const strokeColor = colorMode === 'solid'
    ? hexToRgba(primaryColor, opacity)
    : makeGradient(ctx, startX, 0, startX + waveW, 0, primaryColor, secondaryColor, opacity)

  function drawPath(flip: boolean, alphaScale = 1.0) {
    ctx.beginPath()
    for (let i = 0; i < samples.length; i++) {
      const x   = startX + (i / (samples.length - 1)) * waveW
      const raw = samples[i] * sensitivity
      const y   = cy + (flip ? -raw : raw) * waveH * 0.45
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = strokeColor
    ctx.lineWidth   = 2.5
    ctx.globalAlpha = alphaScale
    ctx.stroke()
  }

  drawPath(false)
  if (mirror) drawPath(true, 0.45)

  // Filled area below the wave
  ctx.beginPath()
  ctx.moveTo(startX, cy)
  for (let i = 0; i < samples.length; i++) {
    const x   = startX + (i / (samples.length - 1)) * waveW
    const raw = samples[i] * sensitivity
    const y   = cy + raw * waveH * 0.45
    ctx.lineTo(x, y)
  }
  ctx.lineTo(startX + waveW, cy)
  ctx.closePath()
  const fillGrad = ctx.createLinearGradient(0, cy - waveH, 0, cy + waveH)
  fillGrad.addColorStop(0, hexToRgba(primaryColor, opacity * 0.3))
  fillGrad.addColorStop(1, hexToRgba(primaryColor, 0))
  ctx.fillStyle = fillGrad
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.fill()

  ctx.restore()
}
