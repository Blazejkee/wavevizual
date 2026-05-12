import { create } from 'zustand'

// ── Template IDs ───────────────────────────────────────────────────────────────
export type TemplateId = 'bars' | 'circular' | 'wave' | 'dual' | 'radial' | 'album' | 'neon'
export type ColorMode = 'solid' | 'gradient' | 'rainbow'
export type BgEffect = 'none' | 'slow-zoom' | 'pulse' | 'parallax'
export type OutputFormat = 'youtube' | 'square' | 'shorts'
export type ZoomMode = 'none' | 'slow' | 'beat'
export type WaveGlow = 'none' | 'soft' | 'strong'
export type TextAlign = 'left' | 'center' | 'right'
export type ActiveTab = 'visual' | 'text' | 'export'

// ── Visualizer config ──────────────────────────────────────────────────────────
export interface VisualizerConfig {
  template: TemplateId
  // Layout
  posX: number          // 0-100 (% of canvas width)
  posY: number          // 0-100 (% of canvas height)
  scale: number         // 0.3-2.0
  // Colors
  colorMode: ColorMode
  primaryColor: string  // hex
  secondaryColor: string
  opacity: number       // 0-1
  // Bars
  barCount: number      // 32-256
  barWidth: number      // 2-30 px
  barGap: number        // 0-10 px
  roundness: number     // 0-20 px
  mirror: boolean
  // FX
  glow: number          // 0-50
  blur: number          // 0-8
  shadow: boolean
  // Audio response
  sensitivity: number   // 0.5-3.0
  smoothing: number     // 0.5-0.99
  bassBoost: number     // 0-5
  reduceFlashing: boolean
}

export const DEFAULT_VIZ: VisualizerConfig = {
  template: 'bars',
  posX: 50,
  posY: 80,
  scale: 1,
  colorMode: 'gradient',
  primaryColor: '#6c63ff',
  secondaryColor: '#00d4ff',
  opacity: 0.95,
  barCount: 64,
  barWidth: 12,   // fill ratio numerator (vs barGap denominator)
  barGap: 4,      // fill ratio denominator contribution
  roundness: 4,
  mirror: false,
  glow: 20,
  blur: 0,
  shadow: true,
  sensitivity: 1.2,
  smoothing: 0.8,
  bassBoost: 1.5,
  reduceFlashing: false,
}

// ── Background config ──────────────────────────────────────────────────────────
export interface BackgroundConfig {
  file: File | null
  type: 'image' | 'video' | null
  url: string | null
  effect: BgEffect
  darken: number    // 0-0.8
  vignette: boolean
  blur: number      // 0-20
}

export const DEFAULT_BG: BackgroundConfig = {
  file: null,
  type: null,
  url: null,
  effect: 'slow-zoom',
  darken: 0.4,
  vignette: true,
  blur: 0,
}

// ── Text layer ─────────────────────────────────────────────────────────────────
export interface TextLayer {
  id: string
  role: 'title' | 'artist' | 'subtitle'
  text: string
  enabled: boolean
  x: number         // 0-100
  y: number         // 0-100
  fontSize: number  // px
  fontWeight: 400 | 600 | 700 | 900
  color: string
  align: TextAlign
  shadow: boolean
  glow: boolean
  letterSpacing: number
  opacity: number
}

export const DEFAULT_TEXT_LAYERS: TextLayer[] = [
  {
    id: 'title',
    role: 'title',
    text: '',
    enabled: true,
    x: 50, y: 10,
    fontSize: 48,
    fontWeight: 700,
    color: '#ffffff',
    align: 'center',
    shadow: true,
    glow: false,
    letterSpacing: 1,
    opacity: 1,
  },
  {
    id: 'artist',
    role: 'artist',
    text: '',
    enabled: true,
    x: 50, y: 18,
    fontSize: 28,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.75)',
    align: 'center',
    shadow: true,
    glow: false,
    letterSpacing: 2,
    opacity: 1,
  },
]

// ── Export config ──────────────────────────────────────────────────────────────
export interface ExportConfig {
  format: OutputFormat
  quality: '1080p' | '4k'
  zoomMode: ZoomMode
  showTextOverlay: boolean
}

export const DEFAULT_EXPORT: ExportConfig = {
  format: 'youtube',
  quality: '1080p',
  zoomMode: 'slow',
  showTextOverlay: true,
}

export interface AuthUser {
  id: string
  email: string
  token_balance: number
  created_at?: string
}

// ── Store state ────────────────────────────────────────────────────────────────
export interface ProjectState {
  // Auth
  user: AuthUser | null

  // Audio
  audioFile: File | null
  audioBuffer: AudioBuffer | null
  audioDuration: number
  audioName: string

  // Background
  background: BackgroundConfig

  // Visualizer
  viz: VisualizerConfig

  // Text
  textLayers: TextLayer[]
  showTextOverlay: boolean

  // UI
  activeTab: ActiveTab

  // Export
  exportConfig: ExportConfig
  activeJobId: string | null
  jobStatus: 'idle' | 'queued' | 'rendering' | 'completed' | 'failed'
  jobProgress: number
  jobQueuePosition: number
  jobError: string | null
  downloadUrl: string | null
}

interface ProjectActions {
  setUser: (user: AuthUser | null) => void
  setAudio: (file: File, buffer: AudioBuffer) => void
  clearAudio: () => void
  setBackground: (patch: Partial<BackgroundConfig>) => void
  setViz: (patch: Partial<VisualizerConfig>) => void
  setTemplate: (id: TemplateId) => void
  setTextLayer: (id: string, patch: Partial<TextLayer>) => void
  setShowTextOverlay: (v: boolean) => void
  setActiveTab: (t: ActiveTab) => void
  setExportConfig: (patch: Partial<ExportConfig>) => void
  setJobState: (patch: Partial<Pick<ProjectState, 'activeJobId' | 'jobStatus' | 'jobProgress' | 'jobQueuePosition' | 'jobError' | 'downloadUrl'>>) => void
  resetJob: () => void
}

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  // Initial state
  user: null,
  audioFile: null,
  audioBuffer: null,
  audioDuration: 0,
  audioName: '',
  background: DEFAULT_BG,
  viz: DEFAULT_VIZ,
  textLayers: DEFAULT_TEXT_LAYERS,
  showTextOverlay: true,
  activeTab: 'visual',
  exportConfig: DEFAULT_EXPORT,
  activeJobId: null,
  jobStatus: 'idle',
  jobProgress: 0,
  jobQueuePosition: 0,
  jobError: null,
  downloadUrl: null,

  // Actions
  setUser: (user) => set({ user }),

  setAudio: (file, buffer) => set({
    audioFile: file,
    audioBuffer: buffer,
    audioDuration: buffer.duration,
    audioName: file.name.replace(/\.[^/.]+$/, ''),
  }),

  clearAudio: () => set({
    audioFile: null,
    audioBuffer: null,
    audioDuration: 0,
    audioName: '',
  }),

  setBackground: (patch) => set(s => ({ background: { ...s.background, ...patch } })),

  setViz: (patch) => set(s => ({ viz: { ...s.viz, ...patch } })),

  setTemplate: (id) => set(s => ({
    viz: { ...s.viz, template: id },
    activeTab: 'visual',
  })),

  setTextLayer: (id, patch) => set(s => ({
    textLayers: s.textLayers.map(l => l.id === id ? { ...l, ...patch } : l),
  })),

  setShowTextOverlay: (v) => set({ showTextOverlay: v }),

  setActiveTab: (t) => set({ activeTab: t }),

  setExportConfig: (patch) => set(s => ({ exportConfig: { ...s.exportConfig, ...patch } })),

  setJobState: (patch) => set(patch),

  resetJob: () => set({
    activeJobId: null,
    jobStatus: 'idle',
    jobProgress: 0,
    jobQueuePosition: 0,
    jobError: null,
    downloadUrl: null,
  }),
}))
