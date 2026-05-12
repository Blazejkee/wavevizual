import React from 'react'

const PRESETS = [
  '#6c63ff', '#00d4ff', '#ffffff', '#00ff88',
  '#ff6b35', '#ff4fc8', '#ffd600', '#ff3d71',
]

interface Props {
  label: string
  value: string
  onChange: (hex: string) => void
}

export default function ColorPicker({ label, value, onChange }: Props) {
  return (
    <div className="prop-field">
      <div className="prop-label">{label}</div>
      <div className="color-row">
        {PRESETS.map(hex => (
          <button
            key={hex}
            type="button"
            className="color-swatch"
            title={hex}
            onClick={() => onChange(hex)}
            style={{
              background: hex,
              border: `2px solid ${value === hex ? 'white' : 'rgba(255,255,255,0.12)'}`,
              boxShadow: value === hex ? `0 0 10px ${hex}88` : 'none',
            }}
          />
        ))}
        <label className="color-custom" title="Custom colour">
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>+</span>
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />
        </label>
        <span className="color-hex">{value.toUpperCase()}</span>
      </div>
    </div>
  )
}
