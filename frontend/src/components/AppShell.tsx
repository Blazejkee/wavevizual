import React, { useState, useCallback } from 'react'
import LeftPanel from './panels/LeftPanel'
import RightPanel from './panels/RightPanel'
import PreviewCanvas from './canvas/PreviewCanvas'
import PlaybackControls from './canvas/PlaybackControls'
import Timeline from './timeline/Timeline'
import type { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import { useProjectStore } from '../store/useProjectStore'

interface Props {
  onHome?: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  onAccount?: () => void
}

export default function AppShell({ onHome, onSignIn, onSignOut, onAccount }: Props) {
  const [analyzer, setAnalyzer] = useState<ReturnType<typeof useAudioAnalyzer> | null>(null)
  const { user } = useProjectStore()

  const handleAnalyzerReady = useCallback((a: ReturnType<typeof useAudioAnalyzer>) => {
    setAnalyzer(a)
  }, [])

  return (
    <div className="app-shell-new">

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div className="shell-left">
        <div style={{ display: 'flex', gap: 8, margin: '12px 12px 0', alignItems: 'center' }}>
          {onHome && (
            <button onClick={onHome} style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
              borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
            }}>
              ← Home
            </button>
          )}
          {user ? (
            <>
              <button onClick={onAccount} title={`Account: ${user.email}`} style={{
                flex: 1, background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.35)',
                color: '#a78bfa', borderRadius: 8, padding: '7px 12px', fontSize: 12,
                cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
              }}>
                ⬡ {user.token_balance} tokens
              </button>
              <button onClick={onSignOut} title="Sign out" style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '7px 10px',
                fontSize: 13, cursor: 'pointer', lineHeight: 1,
              }}>⏏</button>
            </>
          ) : (
            <button onClick={onSignIn} style={{
              background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
              border: 'none', color: '#fff', borderRadius: 8, padding: '7px 12px',
              fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              Sign in
            </button>
          )}
        </div>
        <LeftPanel />
      </div>

      {/* ── Center ─────────────────────────────────────────────────────────── */}
      <div className="shell-center">
        <div className="canvas-area">
          <div className="canvas-wrap">
            <PreviewCanvas onAnalyzerReady={handleAnalyzerReady} />
          </div>
        </div>
        <PlaybackControls analyzer={analyzer} />
        <div className="timeline-area">
          <Timeline analyzer={analyzer} />
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────── */}
      <div className="shell-right">
        <RightPanel />
      </div>

    </div>
  )
}
