import { useState } from 'react'
import { Marker, Popup, Polyline, CircleMarker } from 'react-leaflet'
import MapView from '../components/MapView'
import EISGauge from '../components/EISGauge'
import ComponentBreakdown from '../components/ComponentBreakdown'
import RecommendationCard from '../components/RecommendationCard'
import { api } from '../api/client'

const CAUSES = [
  'vehicle_breakdown', 'accident', 'tree_fall', 'construction', 'water_logging',
  'pot_holes', 'public_event', 'procession', 'vip_movement', 'congestion', 'protest', 'others',
]
const CORRIDORS = [
  'Non-corridor', 'Tumkur Road', 'Mysore Road', 'Bellary Road 1', 'Bellary Road 2',
  'Hosur Road', 'ORR East 1', 'ORR East 2', 'ORR West 1', 'ORR West 2', 'ORR North',
  'Old Madras Road', 'Magadi Road', 'Bannerghata Road', 'West of Chord Road',
  'Airport Road 1', 'Airport Road 2',
]
const JUNCTIONS = [
  '', 'MekhriCircle', 'AyyappaTempleJunc', 'SatteliteBusStandJunc',
  'YeshwanthpuraCircle', 'SilkBoardJunc', 'HebbalFlyover', 'MarathahalliBridge',
]
const VEH_TYPES = ['', 'heavy_vehicle', 'lcv', 'truck', 'bmtc_bus', 'ksrtc_bus', 'private_car', 'private_bus', 'taxi', 'auto']

const DEFAULT = {
  latitude: 12.9716, longitude: 77.5946,
  event_cause: 'vehicle_breakdown', event_type: 'unplanned',
  requires_road_closure: false, corridor: 'Non-corridor',
  junction: '', police_station: '', veh_type: '', hour: null, dow: null,
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-mid)' }}>{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div
      className="rounded-md p-3 text-center shadow-card"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>{label}</div>
    </div>
  )
}

function BarricadeMap({ barricadePoints, lat, lng }) {
  if (!barricadePoints || barricadePoints.length === 0) return null
  return (
    <div className="h-36 rounded-md overflow-hidden mt-3" style={{ border: '1px solid var(--border)' }}>
      <MapView center={[lat, lng]} zoom={14}>
        <CircleMarker center={[lat, lng]} radius={7}
          pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.7, weight: 1.5 }}>
          <Popup>Event location</Popup>
        </CircleMarker>
        {barricadePoints.map((b, i) => (
          <Marker key={i} position={[b.lat, b.lng]}>
            <Popup>{b.label}</Popup>
          </Marker>
        ))}
      </MapView>
    </div>
  )
}

function DiversionMap({ diversion, lat, lng }) {
  if (!diversion) return null
  const hasRoute = diversion.found && diversion.route && diversion.route.length > 0

  if (!hasRoute) {
    return (
      <div
        className="rounded-md p-3 text-[12px] font-light leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', color: 'var(--text-mid)' }}
      >
        {diversion.message}
      </div>
    )
  }

  return (
    <>
      <p className="text-[11px] text-emerald-400 font-medium mb-2">✓ {diversion.message}</p>
      <div className="h-36 rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <MapView center={diversion.route[0] || [lat, lng]} zoom={14}>
          <Polyline positions={diversion.route} pathOptions={{ color: '#10b981', weight: 3, dashArray: '6 3' }} />
          <CircleMarker center={diversion.route[0]} radius={5}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }} />
          <CircleMarker center={diversion.route[diversion.route.length - 1]} radius={5}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }} />
        </MapView>
      </div>
      <p className="text-[10px] font-light mt-1.5" style={{ color: 'var(--text-lo)' }}>
        {diversion.route.length} waypoints
      </p>
    </>
  )
}

export default function EventTriage() {
  const [form, setForm] = useState(DEFAULT)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function handleMapClick({ lat, lng }) {
    set('latitude', parseFloat(lat.toFixed(5)))
    set('longitude', parseFloat(lng.toFixed(5)))
  }

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const r = await api.triage(form)
      setResult(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const durationColor = result
    ? result.predicted_duration_hours > 24 ? '#ef4444'
    : result.predicted_duration_hours > 4  ? '#f97316' : '#10b981'
    : '#f59e0b'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-lo)' }}>
          Predict + Deploy
        </p>
        <h1 className="page-header">Event Triage</h1>
        <p className="text-[13px] font-light mt-1" style={{ color: 'var(--text-mid)' }}>
          Click the map to set location, fill details, and get an instant EIS score and deployment plan.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Left: Form ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Map picker */}
          <div className="rounded-md overflow-hidden shadow-card" style={{ height: 220, border: '1px solid var(--border)' }}>
            <MapView onMapClick={handleMapClick}>
              <Marker position={[form.latitude, form.longitude]}>
                <Popup>Event location<br />{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</Popup>
              </Marker>
            </MapView>
          </div>
          <p className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>
            Click map to place event · {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
          </p>

          {/* Form */}
          <div
            className="rounded-lg p-4 shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p
              className="text-[11px] font-medium pb-2.5 mb-3"
              style={{ color: 'var(--text-lo)', borderBottom: '1px solid var(--border-subtle)' }}
            >
              Event Details
            </p>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Event Cause">
                  <select className="input" value={form.event_cause} onChange={e => set('event_cause', e.target.value)}>
                    {CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </Field>
                <Field label="Event Type">
                  <select className="input" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                    <option value="unplanned">Unplanned</option>
                    <option value="planned">Planned</option>
                  </select>
                </Field>
                <Field label="Corridor">
                  <select className="input" value={form.corridor} onChange={e => set('corridor', e.target.value)}>
                    {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Junction">
                  <select className="input" value={form.junction} onChange={e => set('junction', e.target.value)}>
                    {JUNCTIONS.map(j => <option key={j} value={j}>{j || '— none —'}</option>)}
                  </select>
                </Field>
                <Field label="Police Station">
                  <input className="input" placeholder="e.g. Peenya" value={form.police_station}
                    onChange={e => set('police_station', e.target.value)} />
                </Field>
                <Field label="Vehicle Type">
                  <select className="input" value={form.veh_type} onChange={e => set('veh_type', e.target.value)}>
                    {VEH_TYPES.map(v => <option key={v} value={v}>{v || 'Auto-detect'}</option>)}
                  </select>
                </Field>
                <Field label="Hour IST (0–23)">
                  <input type="number" min="0" max="23" className="input" placeholder="Now"
                    value={form.hour ?? ''} onChange={e => set('hour', e.target.value ? +e.target.value : null)} />
                </Field>
                <Field label="Day of Week (0=Mon)">
                  <input type="number" min="0" max="6" className="input" placeholder="Today"
                    value={form.dow ?? ''} onChange={e => set('dow', e.target.value ? +e.target.value : null)} />
                </Field>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-[13px] font-light" style={{ color: 'var(--text-mid)' }}>
                <input type="checkbox" checked={form.requires_road_closure}
                  onChange={e => set('requires_road_closure', e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500" />
                Requires road closure
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                      Scoring…
                    </span>
                  : '⚡  Run Triage'}
              </button>

              {error && (
                <div
                  className="rounded-md p-3 text-xs"
                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
                >
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="xl:col-span-3 space-y-4">
          {result ? (
            <>
              {/* EIS row */}
              <div
                className="rounded-lg p-5 flex items-center gap-6 shadow-card"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <EISGauge score={result.eis} size="lg" />
                <div className="flex-1 grid grid-cols-2 gap-2.5">
                  <StatCard label="Predicted Duration" value={`${result.predicted_duration_hours.toFixed(1)} h`} color={durationColor} />
                  <StatCard
                    label="Closure Probability"
                    value={`${(result.closure_probability * 100).toFixed(0)}%`}
                    color={result.closure_probability > 0.5 ? '#ef4444' : '#10b981'}
                  />
                  <div
                    className="rounded-md p-3 col-span-2 shadow-card"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                  >
                    <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-lo)' }}>Event ID</div>
                    <div className="font-mono text-amber-400 text-sm font-semibold">{result.event_id}</div>
                  </div>
                </div>
              </div>

              {/* Component breakdown */}
              <ComponentBreakdown components={result.components} />

              {/* Manpower */}
              <RecommendationCard icon="👮" title="Manpower" accent="#f59e0b" badge={`${result.manpower.count} officers`}>
                <div className="flex items-start gap-4">
                  <div>
                    <span className="text-3xl font-bold text-amber-400">{result.manpower.count}</span>
                    <span className="text-xs font-light ml-1.5" style={{ color: 'var(--text-mid)' }}>officers</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[
                      { label: 'EIS 80–100 → 6–8',     active: result.eis >= 80 },
                      { label: 'EIS 50–79 → 3–5',      active: result.eis >= 50 && result.eis < 80 },
                      { label: 'EIS 20–49 → 1–2',      active: result.eis >= 20 && result.eis < 50 },
                      { label: 'EIS 0–19 → monitor',   active: result.eis < 20 },
                    ].map(b => (
                      <div
                        key={b.label}
                        className="text-xs px-2 py-0.5 rounded transition-colors"
                        style={b.active
                          ? { background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }
                          : { color: 'var(--text-lo)' }}
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
                <p
                  className="text-xs font-light leading-relaxed mt-3 pt-3"
                  style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-mid)' }}
                >
                  {result.manpower.rationale}
                </p>
              </RecommendationCard>

              {/* Barricade Points */}
              <RecommendationCard icon="🚧" title="Barricade Points" accent="#f97316" badge={`${result.barricade_points.length} points`}>
                <div className="space-y-1.5">
                  {result.barricade_points.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 font-light" style={{ color: 'var(--text-mid)' }}>{b.label}</span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text-lo)' }}>
                        {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
                <BarricadeMap barricadePoints={result.barricade_points} lat={form.latitude} lng={form.longitude} />
              </RecommendationCard>

              {/* Diversion */}
              <RecommendationCard icon="🔀" title="Diversion" accent="#10b981"
                badge={result.diversion.found ? 'Route found' : 'No route'}>
                <DiversionMap diversion={result.diversion} lat={form.latitude} lng={form.longitude} />
              </RecommendationCard>
            </>
          ) : (
            <div
              className="h-72 xl:h-full flex flex-col items-center justify-center rounded-lg shadow-card"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-5xl mb-4 opacity-20">⚡</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>Submit a triage request to see results</p>
              <p className="text-xs font-light mt-1" style={{ color: 'var(--text-lo)' }}>
                EIS score · Duration · Manpower · Barricades · Diversion
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
