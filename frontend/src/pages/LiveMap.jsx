import { useEffect, useState, useCallback } from 'react'
import { CircleMarker, Popup } from 'react-leaflet'
import MapView from '../components/MapView'
import HeatmapLayer from '../components/HeatmapLayer'
import { api } from '../api/client'

const CAUSES = [
  '', 'vehicle_breakdown', 'accident', 'tree_fall', 'construction',
  'water_logging', 'pot_holes', 'public_event', 'procession',
  'vip_movement', 'congestion', 'protest', 'others',
]

function eisColor(eis) {
  if (eis >= 80) return '#ef4444'
  if (eis >= 50) return '#f97316'
  if (eis >= 20) return '#eab308'
  return '#10b981'
}

function eisRadius(eis) { return Math.max(5, eis / 10) }

const LEGEND = [
  { label: 'Critical 80+',   color: '#ef4444' },
  { label: 'High 50–79',     color: '#f97316' },
  { label: 'Moderate 20–49', color: '#eab308' },
  { label: 'Low < 20',       color: '#10b981' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex items-center h-4 w-8 rounded-full transition-colors duration-200 focus:outline-none shrink-0"
        style={{ background: checked ? '#f59e0b' : 'var(--border)' }}
      >
        <span
          className="inline-block w-3 h-3 rounded-full bg-white transition-transform duration-200"
          style={{ transform: checked ? 'translateX(17px)' : 'translateX(2px)' }}
        />
      </button>
      <span className="text-xs font-light" style={{ color: 'var(--text-mid)' }}>{label}</span>
    </label>
  )
}

export default function LiveMap() {
  const [events, setEvents]             = useState([])
  const [heatPoints, setHeatPoints]     = useState([])
  const [cause, setCause]               = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [showHeat, setShowHeat]         = useState(true)
  const [showMarkers, setShowMarkers]   = useState(true)
  const [autoRefresh, setAutoRefresh]   = useState(false)
  const [lastRefresh, setLastRefresh]   = useState(null)

  useEffect(() => {
    api.heatmap().then(d => setHeatPoints(d.points)).catch(() => {})
  }, [])

  const fetchEvents = useCallback(() => {
    setLoading(true)
    api.activeEvents({ cause: cause || undefined })
      .then(d => { setEvents(d.events); setLastRefresh(new Date()); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [cause])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchEvents])

  const critCount = events.filter(e => e.eis >= 80).length
  const highCount = events.filter(e => e.eis >= 50 && e.eis < 80).length

  return (
    <div className="h-[calc(100vh-64px)] flex">

      {/* Sidebar */}
      <aside
        className="w-60 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>PREDICT · Live Map</span>
          </div>
          <p className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>
            Simulated live feed — historical active events
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Active',   value: loading ? '…' : events.length, color: '#f59e0b' },
            { label: 'Critical', value: loading ? '…' : critCount,     color: '#ef4444' },
            { label: 'High EIS', value: loading ? '…' : highCount,     color: '#f97316' },
            { label: 'Heat pts', value: heatPoints.length,             color: '#3b82f6' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-md p-2 text-center shadow-card"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Filter by cause
          </label>
          <select className="input" value={cause} onChange={e => setCause(e.target.value)}>
            {CAUSES.map(c => <option key={c} value={c}>{c || 'All causes'}</option>)}
          </select>
        </div>

        {/* Layer toggles */}
        <div className="p-3 space-y-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-mid)' }}>Layers</p>
          <Toggle checked={showHeat}     onChange={setShowHeat}     label="Heat density" />
          <Toggle checked={showMarkers}  onChange={setShowMarkers}  label="EIS markers" />
          <Toggle checked={autoRefresh}  onChange={setAutoRefresh}  label="Auto-refresh 30s" />
        </div>

        {/* Legend */}
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--text-mid)' }}>EIS Legend</p>
          <div className="space-y-1.5">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <span className="text-[11px] font-light" style={{ color: 'var(--text-mid)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spatial finding */}
        <div className="m-3 rounded-md p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-[11px] font-medium text-amber-500 mb-1">Spatial finding</p>
          <p className="text-[11px] font-light leading-relaxed text-amber-700">
            Top 10% of ~500m grid cells hold <strong className="text-amber-500">44.5%</strong> of all events.
            Top 20% hold <strong className="text-amber-500">64%</strong>.
          </p>
        </div>

        {/* Refresh / status */}
        <div className="mt-auto p-3">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="btn-secondary w-full py-2 text-xs disabled:opacity-40"
          >
            {loading ? 'Loading…' : '↻  Refresh'}
          </button>
          {lastRefresh && (
            <p className="text-[10px] text-center mt-1.5 font-light" style={{ color: 'var(--text-lo)' }}>
              {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-[11px] mt-2 text-center">{error}</p>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView>
          {showHeat && heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}
          {showMarkers && events.map(ev => (
            <CircleMarker
              key={ev.event_id}
              center={[ev.latitude, ev.longitude]}
              radius={eisRadius(ev.eis)}
              pathOptions={{
                color: eisColor(ev.eis),
                fillColor: eisColor(ev.eis),
                fillOpacity: 0.72,
                weight: 1.5,
              }}
            >
              <Popup maxWidth={210}>
                <div className="text-[12px] space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="font-semibold capitalize" style={{ color: '#1e293b' }}>
                      {ev.event_cause.replace(/_/g, ' ')}
                    </strong>
                    <span
                      className="font-bold text-[11px] px-1.5 rounded"
                      style={{
                        background: eisColor(ev.eis) + '22',
                        color: eisColor(ev.eis),
                        border: `1px solid ${eisColor(ev.eis)}44`,
                      }}
                    >
                      {ev.eis.toFixed(0)}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-slate-500 text-[11px]">
                    <p>📍 {ev.police_station || '—'}</p>
                    <p>Priority: {ev.priority}</p>
                    {ev.requires_road_closure && <p className="text-red-500 font-medium">⚠ Road closure</p>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapView>
      </div>
    </div>
  )
}
