import type { AudioAnalysisData } from '../hooks/useAudioAnalyzer'
import type { VisualizerConfig, TextLayer } from '../store/useProjectStore'

export interface DrawContext {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  t: number                       // seconds elapsed (for animation without audio)
  audio: AudioAnalysisData | null
  viz: VisualizerConfig
  coverImg: HTMLImageElement | null
  isPlaying: boolean
}

export type DrawFn = (dc: DrawContext) => void

// ── Colour helpers ─────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

export function makeGradient(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  c1: string, c2: string, opacity: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, hexToRgba(c1, opacity))
  g.addColorStop(1, hexToRgba(c2, opacity))
  return g
}

export function applyGlow(ctx: CanvasRenderingContext2D, color: string, amount: number) {
  if (!amount) { ctx.shadowBlur = 0; return }
  ctx.shadowColor = color
  ctx.shadowBlur  = amount
}

// ── Simulated (no-audio) data ──────────────────────────────────────────────────

export function simFreq(i: number, n: number, t: number): number {
  const x = i / n
  const bass = Math.abs(Math.sin(t * 1.8 + x * 0.4)) * Math.exp(-x * 2.5)
  const mid  = Math.abs(Math.sin(t * 2.4 + x * 2.0)) * Math.exp(-x * 1.2) * 0.5
  const hi   = Math.abs(Math.sin(t * 4.0 + x * 5.0)) * 0.2
  return Math.min(1, (bass + mid + hi) * 0.85 + 0.08)
}

export function simWave(i: number, n: number, t: number): number {
  const x = i / n
  return (
    0.38 * Math.sin(x * Math.PI * 4  + t * 2.0) +
    0.28 * Math.sin(x * Math.PI * 10 + t * 3.5) +
    0.14 * Math.sin(x * Math.PI * 20 + t * 1.2) +
    0.20 * Math.sin(x * Math.PI * 2  + t * 0.8)
  )
}

// Get normalised frequency bar values from audio or simulation
export function getFreqBars(
  audio: AudioAnalysisData | null,
  n: number,
  t: number,
  sensitivity: number,
  bassBoost: number,
): Float32Array {
  const out = new Float32Array(n)
  if (!audio || !audio.frequencyData.length) {
    for (let i = 0; i < n; i++) out[i] = simFreq(i, n, t)
    return out
  }
  const src = audio.frequencyData
  for (let i = 0; i < n; i++) {
    const srcIdx = Math.floor((i / n) * src.length * 0.8) // use 0-80% of FFT
    const raw = src[srcIdx] / 255
    const boost = i < n * 0.15 ? bassBoost : 1
    out[i] = Math.min(1, raw * sensitivity * boost)
  }
  return out
}

export function getFreqBarsChannel(
  data: Uint8Array,
  n: number,
  sensitivity: number,
): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const srcIdx = Math.floor((i / n) * data.length * 0.8)
    out[i] = Math.min(1, (data[srcIdx] / 255) * sensitivity)
  }
  return out
}

export function getWaveSamples(
  audio: AudioAnalysisData | null,
  n: number,
  t: number,
): Float32Array {
  const out = new Float32Array(n)
  if (!audio || !audio.waveformData.length) {
    for (let i = 0; i < n; i++) out[i] = simWave(i, n, t)
    return out
  }
  const src = audio.waveformData
  for (let i = 0; i < n; i++) {
    const idx = Math.floor((i / n) * src.length)
    out[i] = (src[idx] - 128) / 128
  }
  return out
}
