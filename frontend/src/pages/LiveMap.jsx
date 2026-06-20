import { useEffect, useState, useRef } from 'react'
import { CircleMarker, Popup } from 'react-leaflet'
import MapView from '../components/MapView'
import { api } from '../api/client'

const CAUSES = ['', 'vehicle_breakdown', 'accident', 'tree_fall', 'construction', 'water_logging',
  'pot_holes', 'public_event', 'procession', 'vip_movement', 'congestion', 'others']

function eisColor(eis) {
  if (eis >= 80) return '#ef4444'
  if (eis >= 50) return '#f59e0b'
  if (eis >= 20) return '#eab308'
  return '#22c55e'
}

export default function LiveMap() {
  const [events, setEvents] = useState([])
  const [heatPoints, setHeatPoints] = useState([])
  const [cause, setCause] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    api.heatmap().then(d => setHeatPoints(d.points)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    api.activeEvents({ cause: cause || undefined })
      .then(d => { setEvents(d.events); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [cause])

  return (
    <div className="h-[calc(100vh-60px)] flex">
      <aside className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-amber-400 font-bold tracking-wider text-sm uppercase">PREDICT</h2>
        <p className="text-xs text-slate-500">Simulated live feed — historical active events</p>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Filter by cause</label>
          <select
            className="w-full bg-slate-700 text-slate-200 text-sm rounded px-2 py-1 border border-slate-600"
            value={cause}
            onChange={e => setCause(e.target.value)}
          >
            {CAUSES.map(c => <option key={c} value={c}>{c || 'All causes'}</option>)}
          </select>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">EIS Legend</p>
          {[['Critical (80+)', '#ef4444'], ['High (50–79)', '#f59e0b'], ['Moderate (20–49)', '#eab308'], ['Low (<20)', '#22c55e']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto text-xs text-slate-500">
          {loading ? 'Loading…' : `${events.length} active events`}
          {error && <p className="text-red-400">{error}</p>}
        </div>

        <div className="text-xs text-amber-600 bg-amber-950 rounded p-2">
          Spatial finding: top 10% of grid cells hold 44.5% of all events
        </div>
      </aside>

      <div className="flex-1">
        <MapView>
          {events.map(ev => (
            <CircleMarker
              key={ev.event_id}
              center={[ev.latitude, ev.longitude]}
              radius={Math.max(6, ev.eis / 12)}
              pathOptions={{ color: eisColor(ev.eis), fillColor: eisColor(ev.eis), fillOpacity: 0.7 }}
            >
              <Popup>
                <div className="text-slate-900 text-sm">
                  <strong>{ev.event_cause}</strong><br />
                  EIS: {ev.eis.toFixed(1)}<br />
                  Station: {ev.police_station}<br />
                  Road closure: {ev.requires_road_closure ? 'Yes' : 'No'}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapView>
      </div>
    </div>
  )
}
