import React from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  fmt?: (v: number) => string
  onChange: (v: number) => void
}

export default function Slider({ label, value, min, max, step = 1, unit = '', fmt, onChange }: Props) {
  const display = fmt ? fmt(value) : `${typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : Math.round(value)}${unit}`
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="prop-label">{label}</span>
        <span className="prop-value">{display}</span>
      </div>
      <div className="slider-track-wrap">
        <div className="slider-track-bg" />
        <div className="slider-track-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="slider-input"
        />
      </div>
    </div>
  )
}
