import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
})

// Attach JWT automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('wv_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User { id: string; email: string; token_balance: number; created_at?: string }
export interface AuthResponse { token: string; user: User }

export interface Purchase {
  id: string
  tokens: number
  price_usd: number
  label: string
  created_at: string
}

export interface TokenUsage {
  id: string
  job_id: string
  tokens: number
  quality: string
  created_at: string
}

export interface AccountStats {
  total_renders: number
  tokens_purchased: number
  tokens_spent: number
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password })
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function buyBundle(bundle: string): Promise<User> {
  const { data } = await api.post<User>('/auth/buy', { bundle })
  return data
}

export async function getAccountStats(): Promise<AccountStats> {
  const { data } = await api.get<AccountStats>('/auth/stats')
  return data
}

export async function getMyPurchases(): Promise<Purchase[]> {
  const { data } = await api.get<Purchase[]>('/auth/purchases')
  return data
}

export async function getMyUsage(): Promise<TokenUsage[]> {
  const { data } = await api.get<TokenUsage[]>('/auth/usage')
  return data
}

export async function getMyRenders(): Promise<Job[]> {
  const { data } = await api.get<Job[]>('/auth/renders')
  return data
}

export async function changePassword(old_password: string, new_password: string): Promise<void> {
  await api.post('/auth/change-password', { old_password, new_password })
}

export type JobStatus = 'queued' | 'rendering' | 'completed' | 'failed'

export interface Job {
  id: string
  status: JobStatus
  progress: number
  queue_position: number
  created_at: string
  completed_at?: string
  error?: string
  download_url?: string
  token_cost: number
}

export interface CreateJobPayload {
  audio:        File
  cover_image:  File
  video_loop?:  File
  // Output
  song_title?:      string
  artist_name?:     string
  output_format:    string
  quality:          string
  zoom_mode:        string
  show_title:       boolean
  show_text_overlay: boolean
  // Visualizer
  template:         string
  color_mode:       string
  primary_color:    string
  secondary_color:  string
  opacity:          number
  bar_count:        number
  bar_width:        number
  bar_gap:          number
  roundness:        number
  mirror:           boolean
  glow:             number
  blur:             number
  shadow:           boolean
  sensitivity:      number
  smoothing:        number
  bass_boost:       number
  reduce_flashing:  boolean
  pos_x:            number
  pos_y:            number
  scale:            number
  // Background
  bg_darken:        number
  bg_vignette:      boolean
  bg_blur:          number
  bg_effect:        string
}

export async function createJob(p: CreateJobPayload): Promise<Job> {
  const form = new FormData()
  form.append('audio',       p.audio)
  form.append('cover_image', p.cover_image)
  if (p.video_loop) form.append('video_loop', p.video_loop)

  const str = (v: unknown) => String(v)
  form.append('output_format',    p.output_format === 'square' ? 'instagram' : p.output_format)
  form.append('quality',          p.quality)
  form.append('zoom_mode',        p.zoom_mode)
  form.append('show_title',       str(p.show_title))
  form.append('show_text_overlay', str(p.show_text_overlay))
  form.append('template',         p.template)
  form.append('color_mode',       p.color_mode)
  form.append('primary_color',    p.primary_color)
  form.append('secondary_color',  p.secondary_color)
  form.append('opacity',          str(p.opacity))
  form.append('bar_count',        str(p.bar_count))
  form.append('bar_width',        str(p.bar_width))
  form.append('bar_gap',          str(p.bar_gap))
  form.append('roundness',        str(p.roundness))
  form.append('mirror',           str(p.mirror))
  form.append('glow',             str(p.glow))
  form.append('blur',             str(p.blur))
  form.append('shadow',           str(p.shadow))
  form.append('sensitivity',      str(p.sensitivity))
  form.append('smoothing',        str(p.smoothing))
  form.append('bass_boost',       str(p.bass_boost))
  form.append('reduce_flashing',  str(p.reduce_flashing))
  form.append('pos_x',            str(p.pos_x))
  form.append('pos_y',            str(p.pos_y))
  form.append('scale',            str(p.scale))
  form.append('bg_darken',        str(p.bg_darken))
  form.append('bg_vignette',      str(p.bg_vignette))
  form.append('bg_blur',          str(p.bg_blur))
  form.append('bg_effect',        p.bg_effect)
  if (p.song_title)  form.append('song_title',  p.song_title)
  if (p.artist_name) form.append('artist_name', p.artist_name)

  const { data } = await api.post<Job>('/jobs/create', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getJob(jobId: string): Promise<Job> {
  const { data } = await api.get<Job>(`/jobs/${jobId}`)
  return data
}

export async function listJobs(): Promise<Job[]> {
  const { data } = await api.get<Job[]>('/jobs')
  return data
}
