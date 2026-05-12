import React from 'react'
import { AudioUpload, BackgroundUpload } from './UploadSection'
import TemplateGrid from './TemplateGrid'

export default function LeftPanel() {
  return (
    <div className="left-panel">
      <div className="panel-header">
        <div className="panel-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">WaveVizual</span>
        </div>
      </div>
      <div className="panel-scroll">
        <AudioUpload />
        <BackgroundUpload />
        <TemplateGrid />
      </div>
    </div>
  )
}
