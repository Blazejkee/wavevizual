import React from 'react'
import type { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer'

interface Props {
  analyzer: ReturnType<typeof useAudioAnalyzer> | null
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function PlaybackControls({ analyzer }: Props) {
  if (!analyzer) return (
    <div className="transport-bar">
      <div className="transport-center">
        <button className="transport-btn" disabled>
          <PlayIcon />
        </button>
      </div>
    </div>
  )

  const { isPlaying, currentTime, duration, toggle, seek } = analyzer

  function handleRewind() { seek(0) }
  function handleSkipBack() { seek(Math.max(0, currentTime - 5)) }
  function handleSkipFwd()  { seek(Math.min(duration, currentTime + 5)) }

  return (
    <div className="transport-bar">
      <div className="transport-left">
        <span className="transport-time current">{fmtTime(currentTime)}</span>
        <span className="transport-sep">/</span>
        <span className="transport-time total">{fmtTime(duration)}</span>
      </div>

      <div className="transport-center">
        <button className="transport-btn icon-btn" onClick={handleRewind} title="Rewind">
          <SkipBackIcon />
        </button>
        <button className="transport-btn icon-btn" onClick={handleSkipBack} title="-5s">
          <BackIcon />
        </button>
        <button className="transport-btn play-btn" onClick={toggle} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="transport-btn icon-btn" onClick={handleSkipFwd} title="+5s">
          <FwdIcon />
        </button>
      </div>

      <div className="transport-right">
        <span className="transport-fps">60 FPS</span>
      </div>
    </div>
  )
}

function PlayIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> }
function PauseIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> }
function SkipBackIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg> }
function BackIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z"/></svg> }
function FwdIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg> }
