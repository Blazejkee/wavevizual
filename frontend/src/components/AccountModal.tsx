import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'
import {
  getAccountStats, getMyPurchases, getMyUsage, getMyRenders,
  buyBundle, changePassword,
  type Purchase, type TokenUsage, type AccountStats, type Job,
} from '../api/client'

interface Props {
  onClose: () => void
  onSignOut: () => void
}

type Tab = 'overview' | 'renders' | 'purchases' | 'usage' | 'settings'

const BUNDLES = [
  { key: 'priority', label: 'Priority Pass', tokens: 25,   price: '$9',  color: '#6c63ff' },
  { key: 'creator',  label: 'Creator Pack',  tokens: 100,  price: '$19', color: '#00d4ff' },
  { key: 'pro',      label: 'Pro Pack',      tokens: 1000, price: '$49', color: '#a855f7' },
  { key: 'extra50',  label: '50 tokens',     tokens: 50,   price: '$9',  color: '#6c63ff' },
  { key: 'extra200', label: '200 tokens',    tokens: 200,  price: '$29', color: '#00d4ff' },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export default function AccountModal({ onClose, onSignOut }: Props) {
  const { user, setUser } = useProjectStore()
  const [tab, setTab] = useState<Tab>('overview')

  const [stats, setStats]         = useState<AccountStats | null>(null)
  const [purchases, setPurchases] = useState<Purchase[] | null>(null)
  const [usage, setUsage]         = useState<TokenUsage[] | null>(null)
  const [renders, setRenders]     = useState<Job[] | null>(null)

  const [buyLoading, setBuyLoading]   = useState<string | null>(null)
  const [buyMsg, setBuyMsg]           = useState('')

  const [oldPw, setOldPw]         = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')

  useEffect(() => {
    getAccountStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'purchases' && !purchases)
      getMyPurchases().then(setPurchases).catch(() => setPurchases([]))
    if (tab === 'usage' && !usage)
      getMyUsage().then(setUsage).catch(() => setUsage([]))
    if (tab === 'renders' && !renders)
      getMyRenders().then(setRenders).catch(() => setRenders([]))
  }, [tab])

  async function handleBuy(bundleKey: string) {
    setBuyLoading(bundleKey)
    setBuyMsg('')
    try {
      const updated = await buyBundle(bundleKey)
      setUser(updated)
      setBuyMsg(`Done! ${BUNDLES.find(b => b.key === bundleKey)?.tokens} tokens added.`)
      getAccountStats().then(setStats).catch(() => {})
      getMyPurchases().then(setPurchases).catch(() => {})
    } catch (e: any) {
      setBuyMsg(e?.response?.data?.detail || 'Purchase failed')
    } finally {
      setBuyLoading(null)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (newPw !== confirmPw) { setPwErr('Passwords do not match'); return }
    setPwLoading(true)
    try {
      await changePassword(oldPw, newPw)
      setPwMsg('Password updated successfully.')
      setOldPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      setPwErr(e?.response?.data?.detail || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  if (!user) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'renders',   label: 'Renders'   },
    { id: 'purchases', label: 'Purchases' },
    { id: 'usage',     label: 'Token Usage' },
    { id: 'settings',  label: 'Settings'  },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, width: 780, maxHeight: '90vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden', position: 'relative',
      }}>
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '24px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0,
          }}>
            {initials(user.email)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            {user.created_at && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                Member since {fmt(user.created_at)}
              </div>
            )}
          </div>
          <div style={{
            background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
            borderRadius: 10, padding: '8px 16px', fontSize: 14, color: '#a78bfa', fontWeight: 700,
          }}>
            ⬡ {user.token_balance} tokens
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 2, padding: '0 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', color: tab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer',
              padding: '14px 16px', borderBottom: tab === t.id ? '2px solid #6c63ff' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Overview */}
          {tab === 'overview' && (
            <div>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Token balance',    value: user.token_balance, color: '#a78bfa' },
                  { label: 'Tokens purchased', value: stats?.tokens_purchased ?? '—', color: '#00d4ff' },
                  { label: 'Tokens spent',     value: stats?.tokens_spent     ?? '—', color: '#6c63ff' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '18px 20px',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Total renders', value: stats?.total_renders ?? '—', color: '#ff6b6b' },
                  { label: '1080p cost / render', value: '10 tokens', color: '#fbbf24' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '18px 20px',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Buy tokens */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Top up tokens</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>
                  Tokens never expire. Priority Pass available for Creator & Pro accounts.
                </div>
                {buyMsg && (
                  <div style={{
                    color: buyMsg.includes('failed') ? '#ff6b6b' : '#4ade80',
                    fontSize: 13, marginBottom: 12, fontWeight: 500,
                  }}>{buyMsg}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                  {BUNDLES.slice(0, 3).map(b => (
                    <div key={b.key} style={{
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${b.color}33`,
                      borderRadius: 12, padding: '16px', textAlign: 'center',
                    }}>
                      <div style={{ color: b.color, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.price}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{b.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 }}>
                        {b.tokens} tokens
                      </div>
                      <button onClick={() => handleBuy(b.key)} disabled={buyLoading === b.key} style={{
                        width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                        background: `${b.color}22`, color: b.color,
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        opacity: buyLoading === b.key ? 0.6 : 1,
                      }}>
                        {buyLoading === b.key ? '...' : 'Buy'}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                  {BUNDLES.slice(3).map(b => (
                    <div key={b.key} style={{
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${b.color}33`,
                      borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{b.tokens} tokens · {b.price}</div>
                      </div>
                      <button onClick={() => handleBuy(b.key)} disabled={buyLoading === b.key} style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: `${b.color}22`, color: b.color,
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        opacity: buyLoading === b.key ? 0.6 : 1,
                      }}>
                        {buyLoading === b.key ? '...' : 'Buy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Renders */}
          {tab === 'renders' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Your renders</div>
              {renders === null ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
              ) : renders.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No renders yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {renders.map(r => (
                    <div key={r.id} style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: r.status === 'completed' ? '#4ade80' : r.status === 'failed' ? '#ff6b6b' : '#fbbf24',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
                          {(r as any).settings?.template || 'bars'} · {(r as any).settings?.quality || '1080p'}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                          {fmtTime(r.created_at)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                        background: r.status === 'completed' ? 'rgba(74,222,128,0.12)' :
                                    r.status === 'failed'    ? 'rgba(255,107,107,0.12)' : 'rgba(251,191,36,0.12)',
                        color: r.status === 'completed' ? '#4ade80' : r.status === 'failed' ? '#ff6b6b' : '#fbbf24',
                      }}>
                        {r.status.toUpperCase()}
                      </div>
                      {r.status === 'completed' && r.download_url && (
                        <a href={`/api/jobs/${r.id}/download`} download style={{
                          fontSize: 12, color: '#a78bfa', textDecoration: 'none',
                          padding: '5px 12px', borderRadius: 7, background: 'rgba(108,99,255,0.15)',
                          border: '1px solid rgba(108,99,255,0.3)', whiteSpace: 'nowrap',
                        }}>⬇ Download</a>
                      )}
                      {r.status === 'failed' && (r as any).error && (
                        <div style={{ fontSize: 11, color: '#ff6b6b', maxWidth: 160, wordBreak: 'break-word' }}>
                          {(r as any).error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Purchases */}
          {tab === 'purchases' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Purchase history</div>
              {purchases === null ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
              ) : purchases.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No purchases yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Bundle</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>Tokens</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '12px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fmt(p.created_at)}</td>
                        <td style={{ padding: '12px 0', fontWeight: 600 }}>{p.label || 'Token pack'}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', color: '#a78bfa', fontWeight: 700 }}>+{p.tokens}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>${p.price_usd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Token Usage */}
          {tab === 'usage' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Token usage history</div>
              {usage === null ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
              ) : usage.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No token usage yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Quality</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Job ID</th>
                      <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>Tokens spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map(u => (
                      <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '12px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{fmtTime(u.created_at)}</td>
                        <td style={{ padding: '12px 0' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                            background: u.quality === '4k' ? 'rgba(168,85,247,0.15)' : 'rgba(108,99,255,0.15)',
                            color: u.quality === '4k' ? '#a855f7' : '#a78bfa',
                          }}>{u.quality.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace' }}>
                          {u.job_id.slice(0, 8)}…
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right', color: '#ff6b6b', fontWeight: 700 }}>
                          −{u.tokens}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && (
            <div style={{ maxWidth: 420 }}>
              {/* Change password */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Change password</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 18 }}>
                  Use a strong password of at least 6 characters.
                </div>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(['Current password', 'New password', 'Confirm new password'] as const).map((label, i) => (
                    <div key={label}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{label}</div>
                      <input
                        type="password" required
                        value={[oldPw, newPw, confirmPw][i]}
                        onChange={e => [setOldPw, setNewPw, setConfirmPw][i](e.target.value)}
                        style={{
                          width: '100%', background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                          padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                  {pwErr && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{pwErr}</div>}
                  {pwMsg && <div style={{ color: '#4ade80', fontSize: 13 }}>{pwMsg}</div>}
                  <button type="submit" disabled={pwLoading} style={{
                    background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', border: 'none',
                    color: '#fff', padding: '12px', borderRadius: 10, fontWeight: 700,
                    fontSize: 14, cursor: pwLoading ? 'not-allowed' : 'pointer',
                    opacity: pwLoading ? 0.7 : 1, marginTop: 4,
                  }}>
                    {pwLoading ? 'Saving...' : 'Update password'}
                  </button>
                </form>
              </div>

              {/* Account info (read-only) */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Account info</div>
                {[
                  { label: 'Email', value: user.email },
                  { label: 'Member since', value: user.created_at ? fmt(user.created_at) : '—' },
                ].map(f => (
                  <div key={f.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{f.label}</span>
                    <span style={{ fontSize: 13 }}>{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Sign out */}
              <button onClick={onSignOut} style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)',
                color: '#ff6b6b', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                Sign out
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
