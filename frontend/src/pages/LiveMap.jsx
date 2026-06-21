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
  return '#22c55e'
}

function eisRadius(eis) {
  return Math.max(5, eis / 10)
}

function EISBadge({ value }) {
  const color = eisColor(value)
  return (
    <span className="inline-block font-bold text-xs px-1.5 py-0.5 rounded"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
      {value.toFixed(0)}
    </span>
  )
}

const LEGEND = [
  { label: 'Critical (80+)', color: '#ef4444' },
  { label: 'High (50–79)',   color: '#f97316' },
  { label: 'Moderate (20–49)', color: '#eab308' },
  { label: 'Low (<20)',      color: '#22c55e' },
]

export default function LiveMap() {
  const [events, setEvents]       = useState([])
  const [heatPoints, setHeatPoints] = useState([])
  const [cause, setCause]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showHeat, setShowHeat]   = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  useEffect(() => {
    api.heatmap().then(d => setHeatPoints(d.points)).catch(() => {})
  }, [])

  const fetchEvents = useCallback(() => {
    setLoading(true)
    api.activeEvents({ cause: cause || undefined })
      .then(d => {
        setEvents(d.events)
        setLastRefresh(new Date())
        setLoading(false)
      })
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
    <div className="h-[calc(100vh-56px)] flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-amber-400 font-bold tracking-wider text-xs uppercase">PREDICT · Live Map</h2>
          </div>
          <p className="text-[11px] text-slate-500">Simulated live feed — historical active events</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-lg bg-slate-800/60 p-2 text-center">
            <div className="text-xl font-black text-amber-400">{loading ? '…' : events.length}</div>
            <div className="text-[10px] text-slate-400">Active</div>
          </div>
          <div className="rounded-lg bg-red-950/40 border border-red-900/40 p-2 text-center">
            <div className="text-xl font-black text-red-400">{loading ? '…' : critCount}</div>
            <div className="text-[10px] text-slate-400">Critical</div>
          </div>
          <div className="rounded-lg bg-orange-950/40 border border-orange-900/40 p-2 text-center">
            <div className="text-xl font-black text-orange-400">{loading ? '…' : highCount}</div>
            <div className="text-[10px] text-slate-400">High EIS</div>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-2 text-center">
            <div className="text-xl font-black text-blue-400">{heatPoints.length}</div>
            <div className="text-[10px] text-slate-400">Heat pts</div>
          </div>
        </div>

        {/* Filter */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Filter by cause</label>
          <select
            className="w-full bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2
              border border-slate-700 focus:outline-none focus:border-amber-500"
            value={cause}
            onChange={e => setCause(e.target.value)}
          >
            {CAUSES.map(c => <option key={c} value={c}>{c || 'All causes'}</option>)}
          </select>
        </div>

        {/* Layer toggles */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] text-slate-400 font-medium mb-2">Layers</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-8 h-4 rounded-full transition-colors ${showHeat ? 'bg-amber-500' : 'bg-slate-700'}`}
                onClick={() => setShowHeat(v => !v)}>
                <div className={`w-3 h-3 rounded-full bg-white m-0.5 transition-transform ${showHeat ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-xs text-slate-300">Heat density</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-8 h-4 rounded-full transition-colors ${showMarkers ? 'bg-amber-500' : 'bg-slate-700'}`}
                onClick={() => setShowMarkers(v => !v)}>
                <div className={`w-3 h-3 rounded-full bg-white m-0.5 transition-transform ${showMarkers ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-xs text-slate-300">EIS markers</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`w-8 h-4 rounded-full transition-colors ${autoRefresh ? 'bg-green-500' : 'bg-slate-700'}`}
                onClick={() => setAutoRefresh(v => !v)}>
                <div className={`w-3 h-3 rounded-full bg-white m-0.5 transition-transform ${autoRefresh ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-xs text-slate-300">Auto-refresh 30s</span>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[11px] text-slate-400 font-medium mb-2">EIS Legend</p>
          <div className="space-y-1.5">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="text-[11px] text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spatial finding callout */}
        <div className="m-3 rounded-lg p-3 bg-amber-950/40 border border-amber-900/40">
          <p className="text-[11px] text-amber-400 font-bold mb-1">Spatial finding</p>
          <p className="text-[10px] text-amber-700 leading-relaxed">
            Top 10% of ~500m grid cells hold <strong>44.5%</strong> of all events.
            Top 20% hold <strong>64%</strong>.
          </p>
        </div>

        {/* Refresh / status */}
        <div className="mt-auto p-3">
          <button onClick={fetchEvents} disabled={loading}
            className="w-full text-xs py-2 rounded-lg border transition-colors
              border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-40">
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          {lastRefresh && (
            <p className="text-[10px] text-slate-600 text-center mt-1.5">
              {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          {error && <p className="text-red-400 text-[11px] mt-2 text-center">{error}</p>}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView>
          {showHeat && heatPoints.length > 0 && (
            <HeatmapLayer points={heatPoints} />
          )}
          {showMarkers && events.map(ev => (
            <CircleMarker
              key={ev.event_id}
              center={[ev.latitude, ev.longitude]}
              radius={eisRadius(ev.eis)}
              pathOptions={{
                color: eisColor(ev.eis),
                fillColor: eisColor(ev.eis),
                fillOpacity: 0.75,
                weight: 1.5,
              }}
            >
              <Popup maxWidth={220}>
                <div className="text-xs space-y-1.5 p-1">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-slate-800 font-semibold capitalize">{ev.event_cause.replace(/_/g, ' ')}</strong>
                    <EISBadge value={ev.eis} />
                  </div>
                  <div className="text-slate-500 space-y-0.5">
                    <p>📍 {ev.police_station || '—'}</p>
                    <p>🚦 {ev.priority} priority</p>
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
