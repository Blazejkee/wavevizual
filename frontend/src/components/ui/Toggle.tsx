import React from 'react'

interface Props {
  label: string
  sub?: string
  checked: boolean
  onChange: (v: boolean) => void
}

export default function Toggle({ label, sub, checked, onChange }: Props) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {sub && <div className="toggle-sub">{sub}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
