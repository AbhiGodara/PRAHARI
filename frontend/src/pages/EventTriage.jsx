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

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function StatChip({ label, value, color = '#f59e0b' }) {
  return (
    <div className="rounded-lg p-3 border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="text-xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function BarricadeMap({ barricadePoints, lat, lng }) {
  if (!barricadePoints || barricadePoints.length === 0) return null
  const center = [lat, lng]
  return (
    <div className="h-40 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <MapView center={center} zoom={14}>
        <CircleMarker center={center} radius={8}
          pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.7 }}>
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
  const center = [lat, lng]
  const hasRoute = diversion.found && diversion.route && diversion.route.length > 0

  if (!hasRoute) {
    return (
      <div className="rounded-lg p-3 bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
        {diversion.message}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-green-400 mb-2">✓ {diversion.message}</p>
      <div className="h-40 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <MapView center={diversion.route[0] || center} zoom={14}>
          <Polyline positions={diversion.route} pathOptions={{ color: '#22c55e', weight: 3, dashArray: '8 4' }} />
          <CircleMarker center={diversion.route[0]} radius={6}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.9 }} />
          <CircleMarker center={diversion.route[diversion.route.length - 1]} radius={6}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.9 }} />
        </MapView>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{diversion.route.length} waypoints</p>
    </div>
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
    setLoading(true)
    setError(null)
    try {
      const r = await api.triage(form)
      setResult(r)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const durationColor = result
    ? result.predicted_duration_hours > 24 ? '#ef4444'
    : result.predicted_duration_hours > 4 ? '#f97316' : '#22c55e'
    : '#f59e0b'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <span className="section-eyebrow">PREDICT + DEPLOY</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Event Triage</h1>
        <p className="text-slate-400 text-sm mt-1">
          Click the map to place the event, fill details, and get an instant EIS score + deployment plan.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: Form (2/5) ── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Map */}
          <div className="rounded-xl overflow-hidden border" style={{ height: 220, borderColor: 'var(--border)' }}>
            <MapView onMapClick={handleMapClick}>
              <Marker position={[form.latitude, form.longitude]}>
                <Popup>Event location<br />{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</Popup>
              </Marker>
            </MapView>
          </div>
          <p className="text-[11px] text-slate-500">
            Click map to set location · Lat {form.latitude.toFixed(5)} · Lng {form.longitude.toFixed(5)}
          </p>

          <form onSubmit={submit} className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Event Cause">
                <select className="input" value={form.event_cause} onChange={e => set('event_cause', e.target.value)}>
                  {CAUSES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Event Type">
                <select className="input" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                  <option value="unplanned">Unplanned</option>
                  <option value="planned">Planned</option>
                </select>
              </FormField>
              <FormField label="Corridor">
                <select className="input" value={form.corridor} onChange={e => set('corridor', e.target.value)}>
                  {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Junction (optional)">
                <select className="input" value={form.junction} onChange={e => set('junction', e.target.value)}>
                  {JUNCTIONS.map(j => <option key={j} value={j}>{j || '— none —'}</option>)}
                </select>
              </FormField>
              <FormField label="Police Station">
                <input className="input" placeholder="e.g. Peenya" value={form.police_station}
                  onChange={e => set('police_station', e.target.value)} />
              </FormField>
              <FormField label="Vehicle Type">
                <select className="input" value={form.veh_type} onChange={e => set('veh_type', e.target.value)}>
                  {VEH_TYPES.map(v => <option key={v} value={v}>{v || 'Auto-detect'}</option>)}
                </select>
              </FormField>
              <FormField label="Hour IST (0–23)">
                <input type="number" min="0" max="23" className="input" placeholder="Now"
                  value={form.hour ?? ''} onChange={e => set('hour', e.target.value ? +e.target.value : null)} />
              </FormField>
              <FormField label="Day of Week (0=Mon)">
                <input type="number" min="0" max="6" className="input" placeholder="Today"
                  value={form.dow ?? ''} onChange={e => set('dow', e.target.value ? +e.target.value : null)} />
              </FormField>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.requires_road_closure}
                onChange={e => set('requires_road_closure', e.target.checked)}
                className="w-4 h-4 accent-amber-500" />
              Requires road closure
            </label>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                text-slate-900 font-black text-sm rounded-xl transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> Scoring…</span>
                : '⚡ Run Triage'}
            </button>
            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-800 p-3 text-xs text-red-400">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* ── Right: Results (3/5) ── */}
        <div className="xl:col-span-3 space-y-4">
          {result ? (
            <>
              {/* EIS + stats row */}
              <div className="rounded-xl border p-5 flex items-center gap-6"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <EISGauge score={result.eis} size="lg" />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <StatChip label="Predicted Duration" value={`${result.predicted_duration_hours.toFixed(1)} h`} color={durationColor} />
                  <StatChip label="Closure Probability" value={`${(result.closure_probability * 100).toFixed(0)}%`}
                    color={result.closure_probability > 0.5 ? '#ef4444' : '#22c55e'} />
                  <div className="rounded-lg p-3 border col-span-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] text-slate-500 mb-1">Event ID</div>
                    <div className="font-mono text-amber-400 text-sm font-bold">{result.event_id}</div>
                  </div>
                </div>
              </div>

              {/* Component breakdown */}
              <ComponentBreakdown components={result.components} />

              {/* Manpower */}
              <RecommendationCard icon="👮" title="Manpower Deployment" accent="#f59e0b"
                badge={`${result.manpower.count} officers`}>
                <div className="flex items-end gap-4">
                  <div>
                    <span className="text-4xl font-black text-amber-400">{result.manpower.count}</span>
                    <span className="text-slate-400 text-sm ml-1">officers</span>
                  </div>
                  {/* EIS band visual */}
                  <div className="flex-1 space-y-1">
                    {[
                      { label: 'EIS 80–100 → 6–8', active: result.eis >= 80 },
                      { label: 'EIS 50–79 → 3–5',  active: result.eis >= 50 && result.eis < 80 },
                      { label: 'EIS 20–49 → 1–2',  active: result.eis >= 20 && result.eis < 50 },
                      { label: 'EIS 0–19 → monitor', active: result.eis < 20 },
                    ].map(b => (
                      <div key={b.label} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${b.active ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-600'}`}>
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                  {result.manpower.rationale}
                </p>
              </RecommendationCard>

              {/* Barricade Points */}
              <RecommendationCard icon="🚧" title="Barricade Points" accent="#f97316"
                badge={`${result.barricade_points.length} points`}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    {result.barricade_points.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <span className="text-slate-300 flex-1">{b.label}</span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <BarricadeMap
                    barricadePoints={result.barricade_points}
                    lat={form.latitude}
                    lng={form.longitude}
                  />
                </div>
              </RecommendationCard>

              {/* Diversion */}
              <RecommendationCard icon="🔀" title="Diversion Route" accent="#22c55e"
                badge={result.diversion.found ? 'Route found' : 'No route'}>
                <DiversionMap
                  diversion={result.diversion}
                  lat={form.latitude}
                  lng={form.longitude}
                />
              </RecommendationCard>
            </>
          ) : (
            <div className="h-80 xl:h-full flex flex-col items-center justify-center rounded-xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="text-6xl mb-4 opacity-30">⚡</div>
              <p className="text-slate-500 text-sm font-medium">Submit a triage request to see results</p>
              <p className="text-slate-600 text-xs mt-1">EIS score · Duration · Manpower · Barricades · Diversion</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
