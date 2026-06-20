import { useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MapView from '../components/MapView'
import EISGauge from '../components/EISGauge'
import ComponentBreakdown from '../components/ComponentBreakdown'
import RecommendationCard from '../components/RecommendationCard'
import { api } from '../api/client'

const CAUSES = ['vehicle_breakdown', 'accident', 'tree_fall', 'construction', 'water_logging',
  'pot_holes', 'public_event', 'procession', 'vip_movement', 'congestion', 'protest', 'others']
const CORRIDORS = ['Non-corridor', 'Tumkur Road', 'Mysore Road', 'Bellary Road 1', 'Bellary Road 2',
  'Hosur Road', 'ORR East 1', 'ORR East 2', 'ORR West 1', 'ORR West 2', 'ORR North',
  'Old Madras Road', 'Magadi Road', 'Bannerghata Road', 'West of Chord Road',
  'Airport Road 1', 'Airport Road 2']

const DEFAULT_FORM = {
  latitude: 12.9716, longitude: 77.5946,
  event_cause: 'vehicle_breakdown', event_type: 'unplanned',
  requires_road_closure: false, corridor: 'Non-corridor',
  junction: '', police_station: '', veh_type: '', hour: null, dow: null,
}

export default function EventTriage() {
  const [form, setForm] = useState(DEFAULT_FORM)
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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <span className="text-xs text-amber-500 uppercase tracking-widest">PREDICT + DEPLOY</span>
        <h1 className="text-2xl font-bold text-slate-100">Event Triage</h1>
        <p className="text-slate-400 text-sm mt-1">Click the map to set location, fill details, then submit for an instant EIS score + deployment recommendation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="h-52 rounded-xl overflow-hidden">
            <MapView onMapClick={handleMapClick}>
              <Marker position={[form.latitude, form.longitude]}>
                <Popup>Event location</Popup>
              </Marker>
            </MapView>
          </div>
          <p className="text-xs text-slate-500">Lat: {form.latitude}  Lng: {form.longitude}</p>

          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Event Cause</label>
                <select className="input w-full" value={form.event_cause} onChange={e => set('event_cause', e.target.value)}>
                  {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Type</label>
                <select className="input w-full" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                  <option value="unplanned">Unplanned</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Corridor</label>
                <select className="input w-full" value={form.corridor} onChange={e => set('corridor', e.target.value)}>
                  {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Junction (optional)</label>
                <input className="input w-full" placeholder="e.g. SilkBoardJunc" value={form.junction} onChange={e => set('junction', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Police Station</label>
                <input className="input w-full" placeholder="e.g. Peenya" value={form.police_station} onChange={e => set('police_station', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Vehicle Type</label>
                <select className="input w-full" value={form.veh_type} onChange={e => set('veh_type', e.target.value)}>
                  <option value="">Auto-detect</option>
                  {['heavy_vehicle', 'lcv', 'truck', 'bmtc_bus', 'ksrtc_bus', 'private_car', 'private_bus', 'taxi', 'auto'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Hour (IST, 0–23)</label>
                <input type="number" min="0" max="23" className="input w-full" value={form.hour ?? ''} onChange={e => set('hour', e.target.value ? +e.target.value : null)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Day of Week (0=Mon)</label>
                <input type="number" min="0" max="6" className="input w-full" value={form.dow ?? ''} onChange={e => set('dow', e.target.value ? +e.target.value : null)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.requires_road_closure} onChange={e => set('requires_road_closure', e.target.checked)} className="accent-amber-500" />
              Requires road closure
            </label>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Scoring…' : 'Run Triage'}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="flex items-center gap-8 bg-slate-800 rounded-xl p-6">
                <EISGauge score={result.eis} />
                <div className="space-y-1 text-sm">
                  <p className="text-slate-400">Event ID: <span className="text-amber-400 font-mono">{result.event_id}</span></p>
                  <p className="text-slate-400">Duration: <span className="text-slate-200 font-semibold">{result.predicted_duration_hours.toFixed(1)} h</span></p>
                  <p className="text-slate-400">Closure prob: <span className="text-slate-200 font-semibold">{(result.closure_probability * 100).toFixed(0)}%</span></p>
                </div>
              </div>
              <ComponentBreakdown components={result.components} />
              <RecommendationCard icon="👮" title="Manpower">
                <p className="text-2xl font-bold text-amber-400">{result.manpower.count} officers</p>
                <p className="text-xs text-slate-400 mt-1">{result.manpower.rationale}</p>
              </RecommendationCard>
              <RecommendationCard icon="🚧" title="Barricade Points">
                {result.barricade_points.map((b, i) => (
                  <p key={i} className="text-xs text-slate-300">{b.label} ({b.lat.toFixed(4)}, {b.lng.toFixed(4)})</p>
                ))}
              </RecommendationCard>
              <RecommendationCard icon="🔀" title="Diversion">
                {result.diversion.found
                  ? <p className="text-xs text-green-400">{result.diversion.message} ({result.diversion.route?.length} waypoints)</p>
                  : <p className="text-xs text-slate-400">{result.diversion.message}</p>}
              </RecommendationCard>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm">
              Submit a triage request to see results
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
