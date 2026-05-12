import React from 'react'

interface Option<T> { value: T; label: string }

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label?: string
}

export default function PillSelect<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div className="prop-field">
      {label && <div className="prop-label">{label}</div>}
      <div className="pill-group">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={`pill${value === o.value ? ' active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
