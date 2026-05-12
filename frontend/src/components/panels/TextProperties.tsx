import React from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import type { TextLayer } from '../../store/useProjectStore'
import Toggle from '../ui/Toggle'
import Slider from '../ui/Slider'
import PillSelect from '../ui/PillSelect'
import ColorPicker from '../ui/ColorPicker'

export default function TextProperties() {
  const { textLayers, setTextLayer, showTextOverlay, setShowTextOverlay } = useProjectStore()

  return (
    <div className="props-scroll">
      <Toggle
        label="Show Text Overlay"
        sub="Song title and artist name"
        checked={showTextOverlay}
        onChange={setShowTextOverlay}
      />

      {showTextOverlay && textLayers.map(layer => (
        <TextLayerEditor key={layer.id} layer={layer} />
      ))}
    </div>
  )
}

function TextLayerEditor({ layer }: { layer: TextLayer }) {
  const { setTextLayer } = useProjectStore()
  const s = (patch: Partial<TextLayer>) => setTextLayer(layer.id, patch)

  const roleLabels: Record<string, string> = {
    title:  'Song Title',
    artist: 'Artist Name',
    subtitle: 'Subtitle',
  }

  return (
    <div className="props-group">
      <div className="props-group-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{roleLabels[layer.role] || layer.role}</span>
        <label className="toggle-switch" style={{ transform: 'scale(0.85)' }}>
          <input type="checkbox" checked={layer.enabled} onChange={e => s({ enabled: e.target.checked })} />
          <span className="toggle-slider" />
        </label>
      </div>

      {layer.enabled && (
        <>
          <div className="prop-field">
            <div className="prop-label">Text</div>
            <input
              type="text"
              className="field-input"
              value={layer.text}
              placeholder={layer.role === 'title' ? 'Song Title' : layer.role === 'artist' ? 'Artist Name' : 'Subtitle'}
              onChange={e => s({ text: e.target.value })}
            />
          </div>

          <Slider label="Font Size"     value={layer.fontSize}     min={12} max={96}  unit="px" onChange={v => s({ fontSize: v })} />
          <Slider label="Opacity"       value={Math.round(layer.opacity * 100)} min={10} max={100} unit="%" onChange={v => s({ opacity: v / 100 })} />
          <Slider label="Letter Spacing" value={layer.letterSpacing} min={-5} max={20} unit="px" onChange={v => s({ letterSpacing: v })} />
          <Slider label="Position X"    value={layer.x} min={0} max={100} unit="%" onChange={v => s({ x: v })} />
          <Slider label="Position Y"    value={layer.y} min={0} max={90}  unit="%" onChange={v => s({ y: v })} />

          <ColorPicker label="Text Color" value={layer.color} onChange={v => s({ color: v })} />

          <PillSelect
            label="Alignment"
            value={layer.align}
            onChange={v => s({ align: v })}
            options={[
              { value: 'left',   label: 'Left'   },
              { value: 'center', label: 'Center' },
              { value: 'right',  label: 'Right'  },
            ]}
          />

          <PillSelect
            label="Font Weight"
            value={String(layer.fontWeight)}
            onChange={v => s({ fontWeight: Number(v) as TextLayer['fontWeight'] })}
            options={[
              { value: '400', label: 'Regular' },
              { value: '600', label: 'Semi-Bold' },
              { value: '700', label: 'Bold' },
              { value: '900', label: 'Black' },
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Toggle label="Shadow"  checked={layer.shadow} onChange={v => s({ shadow: v })} />
            <Toggle label="Glow"    checked={layer.glow}   onChange={v => s({ glow: v })} />
          </div>
        </>
      )}
    </div>
  )
}
