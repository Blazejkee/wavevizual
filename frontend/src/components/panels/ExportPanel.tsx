import React, { useState } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { createJob, getJob, getMe } from '../../api/client'
import PillSelect from '../ui/PillSelect'
import Toggle from '../ui/Toggle'

const FORMAT_INFO = {
  youtube: { label: 'YouTube 16:9', desc: '1920 × 1080', icon: '▶' },
  square:  { label: 'Square 1:1',   desc: '1080 × 1080', icon: '⬜' },
  shorts:  { label: 'Shorts 9:16',  desc: '1080 × 1920', icon: '📱' },
}

const TOKEN_COSTS: Record<string, number> = { '1080p': 10, '4k': 25 }

export default function ExportPanel() {
  const {
    audioFile, background, viz, textLayers, showTextOverlay,
    exportConfig, setExportConfig, jobStatus, jobProgress, jobQueuePosition, jobError,
    activeJobId, downloadUrl, setJobState, resetJob, user,
  } = useProjectStore()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const titleLayer  = textLayers.find(l => l.role === 'title')
  const artistLayer = textLayers.find(l => l.role === 'artist')
  const canExport   = !!audioFile && !!background.file

  const tokenCost   = TOKEN_COSTS[exportConfig.quality] ?? 10
  const hasTokens   = user && user.token_balance >= tokenCost
  const isFreeQueue = !user || !hasTokens

  async function handleExport() {
    if (!audioFile || !background.file) return
    setIsSubmitting(true)
    resetJob()

    try {
      const job = await createJob({
        audio:        audioFile,
        cover_image:  background.file!,
        video_loop:   background.type === 'video' ? background.file! : undefined,
        output_format:     exportConfig.format,
        quality:           exportConfig.quality,
        zoom_mode:         exportConfig.zoomMode,
        show_title:        showTextOverlay && !!(titleLayer?.text || artistLayer?.text),
        show_text_overlay: showTextOverlay,
        song_title:        titleLayer?.text  || undefined,
        artist_name:       artistLayer?.text || undefined,
        template:         viz.template,
        color_mode:       viz.colorMode,
        primary_color:    viz.primaryColor,
        secondary_color:  viz.secondaryColor,
        opacity:          viz.opacity,
        bar_count:        viz.barCount,
        bar_width:        viz.barWidth,
        bar_gap:          viz.barGap,
        roundness:        viz.roundness,
        mirror:           viz.mirror,
        glow:             viz.glow,
        blur:             viz.blur,
        shadow:           viz.shadow,
        sensitivity:      viz.sensitivity,
        smoothing:        viz.smoothing,
        bass_boost:       viz.bassBoost,
        reduce_flashing:  viz.reduceFlashing,
        pos_x:            viz.posX,
        pos_y:            viz.posY,
        scale:            viz.scale,
        bg_darken:   background.darken,
        bg_vignette: background.vignette,
        bg_blur:     background.blur,
        bg_effect:   background.effect,
      })

      // Refresh user balance if tokens were spent
      if (hasTokens && user) {
        getMe().then(u => useProjectStore.getState().setUser(u)).catch(() => {})
      }

      setJobState({
        activeJobId: job.id,
        jobStatus: 'queued',
        jobProgress: 0,
        jobQueuePosition: job.queue_position,
      })

      const poll = setInterval(async () => {
        try {
          const updated = await getJob(job.id)
          setJobState({
            jobStatus:        updated.status as any,
            jobProgress:      updated.progress,
            jobQueuePosition: updated.queue_position,
            jobError:         updated.error ?? null,
            downloadUrl:      updated.download_url ?? null,
          })
          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(poll)
            setIsSubmitting(false)
            // Refresh balance on completion
            const { getMe } = await import('../../api/client')
            getMe().then(u => useProjectStore.getState().setUser(u)).catch(() => {})
          }
        } catch {
          clearInterval(poll)
          setIsSubmitting(false)
        }
      }, 1500)

    } catch (err: any) {
      setJobState({ jobStatus: 'failed', jobError: err.message ?? 'Export failed' })
      setIsSubmitting(false)
    }
  }

  const isActive = isSubmitting || jobStatus === 'rendering' || jobStatus === 'queued'

  return (
    <div className="props-scroll">

      {/* ── Format ──────────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Output Format</div>
        <div className="format-cards">
          {(Object.entries(FORMAT_INFO) as [string, typeof FORMAT_INFO.youtube][]).map(([key, info]) => (
            <div
              key={key}
              className={`format-card${exportConfig.format === key ? ' active' : ''}`}
              onClick={() => setExportConfig({ format: key as any })}
            >
              <div className="format-icon">{info.icon}</div>
              <div className="format-label">{info.label}</div>
              <div className="format-desc">{info.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quality ─────────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Quality</div>
        <PillSelect
          value={exportConfig.quality}
          onChange={v => setExportConfig({ quality: v })}
          options={[
            { value: '1080p', label: '1080p HD — 10 tokens' },
            { value: '4k',    label: '4K UHD — 25 tokens'   },
          ]}
        />
      </div>

      {/* ── Token cost / queue info ──────────────────────────────────────────── */}
      <div className="props-group">
        {isFreeQueue ? (
          <div style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)',
                        borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>Free queue</div>
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>
              You'll be placed in a shared queue (100+ people) with ~3 min wait.
              {!user
                ? <> <span style={{ color: '#a78bfa', cursor: 'pointer' }}
                           onClick={() => {}}>Sign in & buy tokens</span> to skip instantly.</>
                : <> Buy tokens to skip the queue instantly.</>
              }
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.25)',
                        borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>Priority render</div>
            <div style={{ color: 'rgba(255,255,255,0.5)' }}>
              Cost: <strong style={{ color: '#fff' }}>{tokenCost} tokens</strong> &nbsp;·&nbsp;
              Balance: <strong style={{ color: '#fff' }}>{user?.token_balance}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Background zoom ──────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Background Animation</div>
        <PillSelect
          label="Zoom Mode"
          value={exportConfig.zoomMode}
          onChange={v => setExportConfig({ zoomMode: v })}
          options={[
            { value: 'none', label: 'Static' },
            { value: 'slow', label: 'Slow Zoom' },
            { value: 'beat', label: 'Beat Zoom' },
          ]}
        />
        <Toggle
          label="Show Text"
          sub="Include title & artist in video"
          checked={exportConfig.showTextOverlay}
          onChange={v => setExportConfig({ showTextOverlay: v })}
        />
      </div>

      {/* ── Status ──────────────────────────────────────────────────────────── */}
      {jobStatus !== 'idle' && (
        <div className="props-group">
          <div className="props-group-title">Export Status</div>
          <div className={`job-status-badge ${jobStatus}`}>
            {jobStatus.toUpperCase()}
          </div>

          {jobQueuePosition > 0 && (jobStatus === 'queued') && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Position in queue: <strong style={{ color: '#fbbf24' }}>{jobQueuePosition}</strong>
            </div>
          )}

          {(jobStatus === 'queued' || jobStatus === 'rendering') && (
            <div className="job-progress">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${jobProgress}%` }} />
              </div>
              <div className="progress-text">{jobProgress}%</div>
            </div>
          )}
          {jobStatus === 'failed' && jobError && (
            <div className="error-box" style={{ marginTop: 8 }}>{jobError}</div>
          )}
          {jobStatus === 'completed' && activeJobId && (
            <div className="download-row">
              <a href={`/api/jobs/${activeJobId}/download`} download className="btn-download">⬇ Download MP4</a>
              <button className="btn-reset" onClick={resetJob}>New Export</button>
            </div>
          )}
        </div>
      )}

      {/* ── Export button ────────────────────────────────────────────────────── */}
      <button
        className="btn-generate"
        onClick={handleExport}
        disabled={!canExport || isActive}
      >
        {isActive
          ? '⏳ Rendering...'
          : !canExport
            ? 'Upload audio + background first'
            : `🎬 Export Video${isFreeQueue ? ' (free queue)' : ` — ${tokenCost} tokens`}`}
      </button>

      {!canExport && (
        <p className="export-hint">Upload an audio file and background to enable export.</p>
      )}
    </div>
  )
}
