import React, { useEffect, useRef } from 'react'
import { useProjectStore } from '../store/useProjectStore'

interface Props {
  onStart: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  onAccount?: () => void
}

const TEMPLATES = [
  { id: 'bars',     name: 'Bars',     icon: '▌▌▌', desc: 'Classic frequency bars — clean and iconic' },
  { id: 'wave',     name: 'Wave',     icon: '∿∿∿', desc: 'Smooth flowing waveform with gradient fill' },
  { id: 'circular', name: 'Circular', icon: '◎',   desc: 'Radial bars spinning around a centre ring' },
  { id: 'dual',     name: 'Dual',     icon: '⇅',   desc: 'Stereo L/R channels mirrored from centre' },
  { id: 'neon',     name: 'Neon',     icon: '〰',   desc: 'Glowing neon lines with layered glow effect' },
  { id: 'radial',   name: 'Radial',   icon: '✦',   desc: 'Pulse rings, orbiting particles & sparks' },
  { id: 'album',    name: 'Album',    icon: '◉',   desc: 'Rotating bars with your album art centred' },
]

const STEPS = [
  { n: '01', title: 'Upload your track', body: 'Drop any MP3, WAV, FLAC or AAC file. We analyse the audio in seconds.' },
  { n: '02', title: 'Pick a template & style', body: 'Choose from 7 visualizer types. Dial in colors, glow, sensitivity and position.' },
  { n: '03', title: 'Export & share', body: 'Render to 1080p or 4K. Download your MP4 and post it anywhere.' },
]

const FORMATS = [
  { key: 'youtube', label: 'YouTube 16:9', size: '1920 × 1080', icon: '▶', color: '#ff4444' },
  { key: 'square',  label: 'Square 1:1',   size: '1080 × 1080', icon: '⬜', color: '#6c63ff' },
  { key: 'shorts',  label: 'Shorts 9:16',  size: '1080 × 1920', icon: '📱', color: '#00d4ff' },
]

const PRICING = [
  {
    name: 'Priority Pass',
    price: '$9',
    period: 'one-time',
    tokens: 25,
    desc: 'Skip the queue for one project',
    color: '#6c63ff',
    bundle: 'priority',
    features: [
      '15 render tokens',
      '~1 HD video (10 tokens each)',
      'Skip free queue instantly',
      'All 7 templates',
      '1080p HD quality',
      'All output formats',
    ],
    cta: 'Get Priority Pass',
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$19',
    period: 'one-time',
    tokens: 100,
    desc: 'For musicians & content creators',
    color: '#00d4ff',
    bundle: 'creator',
    features: [
      '100 render tokens',
      '~10 HD or 4 expert 4K videos',
      'Skip free queue instantly',
      'All 7 templates',
      '1080p + 4K quality',
      'All output formats',
      'Buy more tokens anytime',
    ],
    cta: 'Get Creator Pack',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'one-time',
    tokens: 1000,
    desc: 'For prolific creators',
    color: '#a855f7',
    bundle: 'pro',
    features: [
      '1000 render tokens',
      '~100 HD or 40 expert 4K videos',
      'Highest priority queue',
      'All 7 templates',
      '1080p + 4K quality',
      'All output formats',
      'Buy more tokens anytime',
    ],
    cta: 'Get Pro Pack',
    highlight: false,
  },
]

function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let t = 0

    function frame() {
      const W = canvas!.width
      const H = canvas!.height
      ctx.clearRect(0, 0, W, H)

      const N = 64
      const gap = 3
      const totalW = W * 0.7
      const barW = (totalW - gap * (N - 1)) / N
      const startX = (W - totalW) / 2
      const centerY = H / 2

      for (let i = 0; i < N; i++) {
        const x = i / N
        const bass = Math.abs(Math.sin(t * 1.8 + x * 0.4)) * Math.exp(-x * 2.5)
        const mid  = Math.abs(Math.sin(t * 2.4 + x * 2.0)) * Math.exp(-x * 1.2) * 0.5
        const hi   = Math.abs(Math.sin(t * 4.0 + x * 5.0)) * 0.2
        const v    = Math.min(1, (bass + mid + hi) * 0.85 + 0.08)

        const barH = v * (H * 0.38)
        const bx   = startX + i * (barW + gap)

        const grad = ctx.createLinearGradient(0, centerY - barH, 0, centerY + barH)
        grad.addColorStop(0,   '#6c63ff')
        grad.addColorStop(0.5, '#a855f7')
        grad.addColorStop(1,   '#00d4ff')
        ctx.fillStyle = grad

        const r = Math.min(barW / 2, 4)
        ctx.beginPath()
        ctx.roundRect(bx, centerY - barH, barW, barH * 2, r)
        ctx.fill()

        // glow
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.filter = `blur(6px)`
        ctx.fillStyle = i < N * 0.15 ? '#6c63ff' : '#00d4ff'
        ctx.beginPath()
        ctx.roundRect(bx, centerY - barH, barW, barH * 2, r)
        ctx.fill()
        ctx.restore()
      }

      t += 0.022
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={220}
      style={{ width: '100%', height: '220px', borderRadius: '16px',
               background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    />
  )
}

export default function LandingPage({ onStart, onSignIn, onSignOut, onAccount }: Props) {
  const { user } = useProjectStore()

  return (
    <div style={{ background: '#0a0a12', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    position: 'sticky', top: 0, background: 'rgba(10,10,18,0.92)',
                    backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>≋</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>WaveVizual</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#templates" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Templates</a>
          <a href="#how"       style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>How it works</a>
          <a href="#pricing"   style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Pricing</a>
          {user ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={onAccount} style={{
                background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
                borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#a78bfa',
                cursor: 'pointer', fontWeight: 600,
              }}>
                ⬡ {user.token_balance} tokens
              </button>
              <button onClick={onAccount} style={{ background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Account
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={onSignIn} style={{ background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)',
                padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Sign in
              </button>
              <button onClick={onStart} style={{ background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                                               border: 'none', color: '#fff', padding: '10px 22px',
                                               borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Open Editor
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '100px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
                      borderRadius: 100, padding: '6px 18px', fontSize: 13, color: '#a78bfa', marginBottom: 28 }}>
          ✦ Music visualizer video generator
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800, lineHeight: 1.1,
                     letterSpacing: '-2px', margin: '0 0 24px',
                     background: 'linear-gradient(135deg,#fff 40%,#a78bfa)',
                     WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Turn your music into<br/>a stunning video
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.55)', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Upload any audio file, pick a visualizer style and export a
          professional MP4 in minutes — no editing skills needed.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 60 }}>
          <button onClick={onStart} style={{ background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                                             border: 'none', color: '#fff', padding: '16px 36px',
                                             borderRadius: 12, fontWeight: 700, fontSize: 17, cursor: 'pointer',
                                             boxShadow: '0 8px 32px rgba(108,99,255,0.4)' }}>
            🎬 Start creating — it's free
          </button>
          <a href="#how" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)',
                                  textDecoration: 'none', padding: '16px 24px', fontSize: 15 }}>
            See how it works ↓
          </a>
        </div>
        <HeroCanvas />
        <p style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Live preview — this is what your video will look like</p>
      </section>

      {/* ── Templates ── */}
      <section id="templates" style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14 }}>7 visualizer templates</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17 }}>Each fully customisable — colors, glow, position, scale and more.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
          {TEMPLATES.map((tpl, i) => (
            <div key={tpl.id} onClick={onStart} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '28px 24px', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = 'rgba(108,99,255,0.5)'
              el.style.background  = 'rgba(108,99,255,0.08)'
              el.style.transform   = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = 'rgba(255,255,255,0.08)'
              el.style.background  = 'rgba(255,255,255,0.04)'
              el.style.transform   = 'translateY(0)'
            }}>
              <div style={{ fontSize: 32, marginBottom: 14,
                            background: `linear-gradient(135deg,${i % 2 === 0 ? '#6c63ff,#00d4ff' : '#a855f7,#ff6b6b'})`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {tpl.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{tpl.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.5 }}>{tpl.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14 }}>Done in three steps</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17 }}>From upload to download in under 5 minutes.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {STEPS.map(step => (
              <div key={step.n} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6c63ff', letterSpacing: 2, marginBottom: 16 }}>{step.n}</div>
                <div style={{ width: 1, height: 40, background: 'linear-gradient(#6c63ff,transparent)', margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Output formats ── */}
      <section style={{ padding: '80px 48px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14 }}>Every format, every platform</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17, marginBottom: 48 }}>Export in the exact resolution your platform expects.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {FORMATS.map(f => (
            <div key={f.key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: 20, padding: '36px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{f.label}</div>
              <div style={{ color: f.color, fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
                            background: `${f.color}18`, borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>
                {f.size}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 32 }}>
          {['1080p HD', '4K UHD', 'H.264 MP4', '30 fps'].map(tag => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8,
                                    color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              <span style={{ color: '#6c63ff' }}>✓</span> {tag}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '80px 48px', background: 'rgba(255,255,255,0.02)',
                                      borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1050, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14 }}>Token-based pricing</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 17 }}>
              Buy once, use when you need. 1080p = 10 tokens · 4K = 25 tokens.
            </p>
          </div>

          {/* Free tier banner */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16, padding: '20px 28px', marginBottom: 32,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Free — always available</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
                No account needed. Generate any video for free — joins a shared queue (100+ people, ~3 min wait).
              </div>
            </div>
            <button onClick={onStart} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', padding: '11px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Try for free →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${plan.highlight ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 20, padding: '36px 28px', position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                                background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', color: '#fff',
                                fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100,
                                whiteSpace: 'nowrap' }}>
                    BEST VALUE
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: plan.color, textTransform: 'uppercase',
                              letterSpacing: 1, marginBottom: 12 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-2px' }}>{plan.price}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{plan.period}</span>
                </div>
                <div style={{ color: plan.color, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  {plan.tokens} tokens included
                </div>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>{plan.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                         color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                      <span style={{ color: plan.color, fontSize: 16 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={onSignIn ?? onStart} style={{
                  width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', border: 'none',
                  background: plan.highlight ? 'linear-gradient(135deg,#6c63ff,#00d4ff)' : `${plan.color}22`,
                  color: plan.highlight ? '#fff' : plan.color,
                  boxShadow: plan.highlight ? '0 8px 24px rgba(108,99,255,0.35)' : 'none',
                }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Tokens never expire · Creator & Pro packs can buy additional 50 or 200 extra tokens anytime
          </p>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ padding: '100px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 20,
                     background: 'linear-gradient(135deg,#fff 40%,#a78bfa)',
                     WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Ready to make your music visual?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, marginBottom: 40 }}>
          Open the editor, upload a track and create your first video for free.
        </p>
        <button onClick={onStart} style={{ background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                                           border: 'none', color: '#fff', padding: '18px 48px',
                                           borderRadius: 14, fontWeight: 700, fontSize: 18, cursor: 'pointer',
                                           boxShadow: '0 12px 40px rgba(108,99,255,0.4)' }}>
          🎬 Open the editor
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '32px 48px',
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>≋</div>
          <span>WaveVizual</span>
        </div>
        <span>© 2026 WaveVizual. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>

    </div>
  )
}
