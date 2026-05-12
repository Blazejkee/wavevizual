import type { DrawFn } from './types'
import { applyGlow, hexToRgba } from './types'

export const drawRadial: DrawFn = ({ ctx, W, H, t, audio, viz }) => {
  const { primaryColor, secondaryColor, opacity, glow, sensitivity,
          bassBoost, posX, posY, scale, reduceFlashing } = viz

  const cx    = W * (posX / 100)
  const cy    = H * (posY / 100)
  const bass  = audio ? Math.min(1, audio.bass * sensitivity * (1 + bassBoost * 0.3)) : (0.5 + 0.4 * Math.sin(t * 2.2))
  const mids  = audio ? Math.min(1, audio.mids * sensitivity)                         : (0.4 + 0.3 * Math.sin(t * 3.1))
  const highs = audio ? Math.min(1, audio.highs * sensitivity)                        : (0.3 + 0.2 * Math.sin(t * 5.0))

  const pulse = reduceFlashing ? Math.min(0.5, bass) : bass

  ctx.save()

  // Outer pulse ring
  for (let ring = 3; ring >= 0; ring--) {
    const ringScale = 0.6 + ring * 0.35
    const r     = Math.min(W, H) * 0.12 * scale * ringScale * (1 + pulse * 0.45)
    const alpha = (0.8 - ring * 0.18) * opacity
    const blur  = glow * (1 - ring * 0.2)

    applyGlow(ctx, primaryColor, blur)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)

    if (ring === 0) {
      // Filled core
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0, hexToRgba(primaryColor, alpha))
      grad.addColorStop(0.6, hexToRgba(secondaryColor, alpha * 0.6))
      grad.addColorStop(1, hexToRgba(secondaryColor, 0))
      ctx.fillStyle = grad
      ctx.fill()
    } else {
      ctx.strokeStyle = hexToRgba(ring % 2 === 0 ? primaryColor : secondaryColor, alpha * 0.7)
      ctx.lineWidth   = Math.max(1, 3 - ring * 0.5)
      ctx.stroke()
    }
  }

  // Mid-frequency particles
  const numParticles = 12
  for (let i = 0; i < numParticles; i++) {
    const angle  = (i / numParticles) * Math.PI * 2 + t * 0.8
    const dist   = Math.min(W, H) * 0.12 * scale * (1.8 + mids * 0.8)
    const px     = cx + Math.cos(angle) * dist
    const py     = cy + Math.sin(angle) * dist
    const pSize  = 2 + highs * 4

    ctx.shadowBlur = glow * 0.5
    ctx.fillStyle  = hexToRgba(secondaryColor, opacity * 0.8)
    ctx.beginPath()
    ctx.arc(px, py, pSize, 0, Math.PI * 2)
    ctx.fill()
  }

  // High-freq outer sparks
  if (!reduceFlashing && highs > 0.4) {
    const numSparks = 20
    for (let i = 0; i < numSparks; i++) {
      const angle  = (i / numSparks) * Math.PI * 2 + t * 2.5
      const inner  = Math.min(W, H) * 0.15 * scale * (1 + pulse * 0.5)
      const outer  = inner + highs * Math.min(W, H) * 0.08 * scale
      const sx     = cx + Math.cos(angle)
      const sy     = cy + Math.sin(angle)
      ctx.strokeStyle = hexToRgba(primaryColor, opacity * highs * 0.6)
      ctx.lineWidth   = 1
      ctx.shadowBlur  = glow * 0.3
      ctx.beginPath()
      ctx.moveTo(sx * inner, sy * inner)
      ctx.lineTo(sx * outer, sy * outer)
      ctx.stroke()
    }
  }

  ctx.restore()
}
