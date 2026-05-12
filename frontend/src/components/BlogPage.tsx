import React, { useState } from 'react'

interface NavProps {
  onHome?: () => void
  onBlog?: () => void
  onLegal?: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  onAccount?: () => void
}

type Tag = 'Feature' | 'Update' | 'News'

interface Post {
  slug: string
  title: string
  date: string
  tag: Tag
  tagColor: string
  excerpt: string
  content: { heading?: string; body: string }[]
}

const POSTS: Post[] = [
  {
    slug: 'drag-to-reposition',
    title: 'Drag to reposition your visualizer',
    date: 'May 13, 2026',
    tag: 'Feature',
    tagColor: '#00d4ff',
    excerpt: 'You can now click and drag directly on the preview canvas to position your visualizer exactly where you want it — no more fiddling with X/Y sliders.',
    content: [
      {
        body: 'Positioning the visualizer used to mean nudging sliders and guessing. Now you just grab it — click anywhere on the preview canvas and drag the visualizer to exactly where you want it.',
      },
      {
        heading: 'How it works',
        body: 'A live X/Y coordinate readout appears while you drag so you can hit precise positions. The canvas shows a "grab" cursor on hover as a hint. Works on all 7 templates and responds to touch on mobile too.',
      },
      {
        heading: 'Works everywhere',
        body: 'Bars, Wave, Circular, Dual, Neon, Radial, Album — every visualizer supports drag-to-reposition. The position is wired to the same posX/posY values as the sliders, so the panel stays in sync.',
      },
    ],
  },
  {
    slug: 'token-system',
    title: 'Token-based rendering — priority queue now live',
    date: 'May 12, 2026',
    tag: 'Feature',
    tagColor: '#a855f7',
    excerpt: 'We launched a token economy for WaveVizual. Buy a token pack once, use it whenever. Free users can still generate — they just join a shared queue.',
    content: [
      {
        body: 'WaveVizual is free to use. Always. But if you want your video rendered instantly — without sitting in a shared queue — you can now buy tokens and skip straight to the front.',
      },
      {
        heading: 'How tokens work',
        body: '1080p renders cost 10 tokens. 4K costs 25. Tokens never expire. No subscription, no recurring charges — buy once, use when you need them.',
      },
      {
        heading: 'Three packs',
        body: 'Priority Pass ($9) gives 25 tokens — enough for a couple of HD renders. Creator Pack ($19) includes 100 tokens, roughly 10 HD or 4 expert 4K videos. Pro Pack ($49) gives 1000 tokens for high-volume creators, with the option to top up with extra 50 or 200 token add-ons.',
      },
      {
        heading: 'Free queue',
        body: 'No account needed. Free users are placed in a shared rendering queue. The wait is typically around 3 minutes. Your video still gets rendered — it just takes a little longer.',
      },
    ],
  },
  {
    slug: '7-templates',
    title: '7 visualizer templates — all fully customisable',
    date: 'May 10, 2026',
    tag: 'Feature',
    tagColor: '#6c63ff',
    excerpt: 'WaveVizual ships with 7 distinct visualizer styles, each with its own personality. Tweak colors, glow, scale, position, and audio sensitivity to taste.',
    content: [
      {
        body: 'We built seven visualizer templates from scratch, each tuned to a different aesthetic. Pick the one that fits your track, then dial it in with the controls on the right panel.',
      },
      {
        heading: 'Bars',
        body: 'The classic. Frequency bars rising and falling in sync with your music. Supports mirror mode, gradient colors, rounded corners, and per-bar glow.',
      },
      {
        heading: 'Wave',
        body: 'A smooth, flowing waveform with gradient fill. Great for ambient, lo-fi, and atmospheric tracks.',
      },
      {
        heading: 'Circular',
        body: 'Radial bars spinning around a centre ring. Looks great on square and shorts formats.',
      },
      {
        heading: 'Dual',
        body: 'Stereo left/right channels mirrored from the center. Gives a clean, symmetrical look.',
      },
      {
        heading: 'Neon',
        body: 'Layered glowing lines with a strong neon aesthetic. Turn up the glow and blur for a cyberpunk feel.',
      },
      {
        heading: 'Radial',
        body: 'Pulse rings, orbiting particles, and spark trails. The most dynamic template — best with high-energy tracks.',
      },
      {
        heading: 'Album',
        body: 'Your album art rotating at the centre with visualizer bars wrapping around it. Perfect for sharing on social media.',
      },
    ],
  },
  {
    slug: 'launch',
    title: 'Introducing WaveVizual',
    date: 'May 8, 2026',
    tag: 'News',
    tagColor: '#ff6b6b',
    excerpt: 'WaveVizual is a music visualizer video generator that turns any audio file into a professional MP4 in minutes. No editing skills needed.',
    content: [
      {
        body: 'We built WaveVizual because every existing option was either too complicated, too expensive, or produced generic-looking results. We wanted something fast, beautiful, and built for creators — not studios.',
      },
      {
        heading: 'What it does',
        body: 'Upload any MP3, WAV, FLAC, or AAC file. Pick a visualizer style. Adjust colors, glow, and layout. Export a high-quality MP4 ready for YouTube, Instagram, or anywhere else.',
      },
      {
        heading: 'Three output formats',
        body: 'YouTube 16:9 (1920×1080), Square 1:1 (1080×1080) for Instagram and TikTok, and Shorts 9:16 (1080×1920) for vertical video. All at up to 4K resolution.',
      },
      {
        heading: "What's next",
        body: 'More templates, a background video option, text animation styles, and a timeline editor for fine-grained control over timing. We ship fast.',
      },
    ],
  },
]

const TAG_COLORS: Record<Tag, string> = {
  Feature: '#00d4ff',
  Update:  '#a855f7',
  News:    '#ff6b6b',
}

function SiteNav({ onHome, onBlog, onLegal, onSignIn }: NavProps) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, background: 'rgba(10,10,18,0.92)',
      backdropFilter: 'blur(12px)', zIndex: 100,
    }}>
      <button onClick={onHome} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>≋</div>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', color: '#fff' }}>WaveVizual</span>
      </button>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <button onClick={onBlog} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Blog</button>
        <button onClick={onLegal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>Legal</button>
        <button onClick={onHome} style={{
          background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', border: 'none',
          color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Open Editor</button>
      </div>
    </nav>
  )
}

export default function BlogPage(props: NavProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  const openPost = openSlug ? POSTS.find(p => p.slug === openSlug) : null

  return (
    <div style={{ background: '#0a0a12', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <SiteNav {...props} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 48px 100px' }}>

        {openPost ? (
          /* ── Single post view ── */
          <div>
            <button onClick={() => setOpenSlug(null)} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 40,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ← All posts
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                background: `${TAG_COLORS[openPost.tag]}18`,
                border: `1px solid ${TAG_COLORS[openPost.tag]}44`,
                color: TAG_COLORS[openPost.tag], letterSpacing: 0.5,
              }}>{openPost.tag.toUpperCase()}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{openPost.date}</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800,
              letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 40,
            }}>{openPost.title}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {openPost.content.map((block, i) => (
                <div key={i}>
                  {block.heading && (
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#e2e8f0' }}>
                      {block.heading}
                    </h2>
                  )}
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.75, margin: 0 }}>
                    {block.body}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button onClick={() => props.onHome?.()} style={{
                background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', border: 'none',
                color: '#fff', padding: '13px 32px', borderRadius: 10, fontWeight: 700,
                fontSize: 15, cursor: 'pointer',
              }}>🎬 Try it yourself</button>
            </div>
          </div>

        ) : (
          /* ── Post list ── */
          <div>
            <div style={{ marginBottom: 56 }}>
              <div style={{
                display: 'inline-block', background: 'rgba(108,99,255,0.15)',
                border: '1px solid rgba(108,99,255,0.35)', borderRadius: 100,
                padding: '5px 16px', fontSize: 12, color: '#a78bfa', marginBottom: 20,
              }}>Updates & features</div>
              <h1 style={{
                fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800,
                letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16,
              }}>WaveVizual Blog</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, maxWidth: 480 }}>
                New features, product updates, and tips for getting the most out of your visualizer videos.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {POSTS.map((post, i) => (
                <button key={post.slug} onClick={() => setOpenSlug(post.slug)} style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                }}>
                  <article style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16, padding: '28px 32px',
                    transition: 'all 0.2s', marginBottom: 12,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(255,255,255,0.06)'
                    el.style.borderColor = 'rgba(108,99,255,0.3)'
                    el.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(255,255,255,0.03)'
                    el.style.borderColor = 'rgba(255,255,255,0.07)'
                    el.style.transform = 'translateY(0)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                        background: `${post.tagColor}18`, border: `1px solid ${post.tagColor}44`,
                        color: post.tagColor, letterSpacing: 0.5,
                      }}>{post.tag.toUpperCase()}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{post.date}</span>
                      {i === 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                          background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
                          color: '#4ade80', letterSpacing: 0.5,
                        }}>NEW</span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>
                      {post.title}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.65, margin: '0 0 18px' }}>
                      {post.excerpt}
                    </p>
                    <span style={{ fontSize: 13, color: '#6c63ff', fontWeight: 600 }}>
                      Read more →
                    </span>
                  </article>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: 13,
      }}>
        <span>© 2026 WaveVizual</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={props.onBlog}  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>Blog</button>
          <button onClick={props.onLegal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>Legal</button>
        </div>
      </footer>
    </div>
  )
}
