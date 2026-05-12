import React from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import Slider from '../ui/Slider'
import Toggle from '../ui/Toggle'
import PillSelect from '../ui/PillSelect'
import ColorPicker from '../ui/ColorPicker'

export default function VisualProperties() {
  const { viz, setViz, background, setBackground } = useProjectStore()
  const s = (patch: any) => setViz(patch)

  return (
    <div className="props-scroll">

      {/* ── Colors ──────────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Color</div>
        <PillSelect
          label="Color Mode"
          value={viz.colorMode}
          onChange={v => s({ colorMode: v })}
          options={[
            { value: 'solid',    label: 'Solid' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'rainbow',  label: 'Rainbow' },
          ]}
        />
        <ColorPicker label="Primary Color"  value={viz.primaryColor}   onChange={v => s({ primaryColor: v })} />
        {viz.colorMode === 'gradient' && (
          <ColorPicker label="Secondary Color" value={viz.secondaryColor} onChange={v => s({ secondaryColor: v })} />
        )}
        <Slider label="Opacity" value={Math.round(viz.opacity * 100)} min={10} max={100} step={5} unit="%" onChange={n => s({ opacity: n / 100 })} />
      </div>

      {/* ── Shape ───────────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Shape</div>
        <Slider label="Bar Count"   value={viz.barCount}  min={16} max={256} step={8}   onChange={v => s({ barCount: v })} />
        <Slider label="Bar Thickness" value={viz.barWidth} min={1}  max={30}  step={1}   onChange={v => s({ barWidth: v })} />
        <Slider label="Bar Gap"     value={viz.barGap}    min={0}  max={20}  step={1}   onChange={v => s({ barGap: v })} />
        <Slider label="Roundness"   value={viz.roundness} min={0}  max={20}  step={1} unit="px" onChange={v => s({ roundness: v })} />
        <Toggle label="Mirror" sub="Reflect vertically" checked={viz.mirror} onChange={v => s({ mirror: v })} />
      </div>

      {/* ── Position & Scale ─────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Position & Scale</div>
        <Slider label="Position X" value={viz.posX}  min={5}   max={95}  unit="%" onChange={v => s({ posX: v })} />
        <Slider label="Position Y" value={viz.posY}  min={5}   max={95}  unit="%" onChange={v => s({ posY: v })} />
        <Slider label="Size" value={Math.round(viz.scale * 100)} min={20} max={200} step={5} unit="%" onChange={v => s({ scale: v / 100 })} />
      </div>

      {/* ── Effects ─────────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Effects</div>
        <Slider label="Glow"       value={viz.glow}  min={0} max={60} unit="px" onChange={v => s({ glow: v })} />
        <Slider label="Blur"       value={viz.blur}  min={0} max={8}  step={0.5} unit="px" onChange={v => s({ blur: v })} />
        <Toggle label="Shadow" sub="Drop shadow beneath bars" checked={viz.shadow} onChange={v => s({ shadow: v })} />
      </div>

      {/* ── Audio Response ───────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Audio Response</div>
        <Slider label="Sensitivity" value={viz.sensitivity} min={0.3} max={4.0} step={0.1} fmt={v => v.toFixed(1)} onChange={v => s({ sensitivity: v })} />
        <Slider label="Smoothing"   value={Math.round(viz.smoothing * 100)} min={0} max={99} unit="%" onChange={v => s({ smoothing: v / 100 })} />
        <Slider label="Bass Boost"  value={viz.bassBoost}   min={0}   max={5.0} step={0.1} fmt={v => v.toFixed(1)} onChange={v => s({ bassBoost: v })} />
        <Toggle
          label="Reduce Flashing"
          sub="Limits rapid brightness changes"
          checked={viz.reduceFlashing}
          onChange={v => s({ reduceFlashing: v })}
        />
      </div>

      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div className="props-group">
        <div className="props-group-title">Background</div>
        <Slider label="Darken" value={Math.round(background.darken * 100)} min={0} max={80} unit="%" onChange={v => setBackground({ darken: v / 100 })} />
        <Slider label="Blur"   value={background.blur} min={0} max={20} unit="px" onChange={v => setBackground({ blur: v })} />
        <Toggle label="Vignette" sub="Darken edges" checked={background.vignette} onChange={v => setBackground({ vignette: v })} />
      </div>

    </div>
  )
}
