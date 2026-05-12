import React from 'react'
import { useProjectStore, type ActiveTab } from '../../store/useProjectStore'
import VisualProperties from './VisualProperties'
import TextProperties from './TextProperties'
import ExportPanel from './ExportPanel'

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'visual', label: 'Visual',  icon: '✦' },
  { id: 'text',   label: 'Text',    icon: 'T' },
  { id: 'export', label: 'Export',  icon: '↗' },
]

export default function RightPanel() {
  const { activeTab, setActiveTab } = useProjectStore()

  return (
    <div className="right-panel">
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-content">
        {activeTab === 'visual' && <VisualProperties />}
        {activeTab === 'text'   && <TextProperties />}
        {activeTab === 'export' && <ExportPanel />}
      </div>
    </div>
  )
}
