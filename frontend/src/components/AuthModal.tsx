import React, { useState } from 'react'
import { login, register } from '../api/client'

interface Props {
  onSuccess: (token: string, user: { id: string; email: string; token_balance: number }) => void
  onClose: () => void
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await login(email, password)
        : await register(email, password)
      localStorage.setItem('wv_token', res.token)
      onSuccess(res.token, res.user)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 20, padding: '40px 36px', width: 380, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16,
                                           background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                                           fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7,
                        background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>≋</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>WaveVizual</span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 28 }}>
          {mode === 'login' ? 'Sign in to access your tokens' : 'Start creating visualizer videos'}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14,
                     outline: 'none', width: '100%' }}
          />
          <input
            type="password" placeholder="Password (min 6 chars)" value={password}
            onChange={e => setPassword(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14,
                     outline: 'none', width: '100%' }}
          />
          {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', border: 'none',
            color: '#fff', padding: '13px', borderRadius: 10, fontWeight: 700,
            fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                style={{ color: '#6c63ff', cursor: 'pointer', textDecoration: 'underline' }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  )
}
