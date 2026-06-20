import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function ConcurrentAllocator() {
  const [stations, setStations] = useState([])
  const [station, setStation] = useState('')
  const [pool, setPool] = useState(20)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.stations().then(d => { setStations(d.stations); setStation(d.stations[0] || '') }).catch(() => {})
  }, [])

  async function run() {
    if (!station) return
    setLoading(true)
    setError(null)
    try {
      const r = await api.allocate({ police_station: station, officer_pool: pool })
      setResult(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const covered = result?.allocations.filter(a => a.covered).length ?? 0
  const uncovered = result?.allocations.filter(a => !a.covered).length ?? 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <span className="text-xs text-amber-500 uppercase tracking-widest">DEPLOY</span>
      <h1 className="text-2xl font-bold text-slate-100 mb-1">Concurrent Allocator</h1>
      <p className="text-slate-400 text-sm mb-6">
        11.5% of (station, hour) slots have ≥2 concurrent active events. One slot hit 53 concurrent.
        This tool shows who gets officers when the pool runs out.
      </p>

      <div className="bg-slate-800 rounded-xl p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-400 block mb-1">Police Station</label>
          <select className="input w-full" value={station} onChange={e => setStation(e.target.value)}>
            {stations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Officer Pool: {pool}</label>
          <input type="range" min={1} max={60} value={pool} onChange={e => setPool(+e.target.value)} className="accent-amber-500 w-40" />
        </div>
        <button onClick={run} disabled={loading || !station}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
          {loading ? 'Running…' : 'Stress Test Busiest Slot'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <>
          <div className="flex gap-4 mb-4 text-sm">
            <div className="bg-slate-800 rounded-lg px-4 py-2">
              <span className="text-slate-400">Window: </span>
              <span className="text-slate-200">{result.window_start?.slice(0, 16)} — {result.window_end?.slice(0, 16)}</span>
            </div>
            <div className="bg-green-900/40 border border-green-700 rounded-lg px-4 py-2 text-green-400">
              {covered} covered
            </div>
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-2 text-red-400">
              {uncovered} uncovered
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-2 text-slate-400">
              {result.total_requested} requested / {result.total_pool} in pool
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 text-left">
                  <th className="px-4 py-3">Event ID</th>
                  <th className="px-4 py-3">Cause</th>
                  <th className="px-4 py-3">EIS</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Allocated</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.allocations.map((a, i) => (
                  <tr key={i} className={`border-t border-slate-700 ${!a.covered ? 'bg-red-950/30' : ''}`}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-400">{a.event_id}</td>
                    <td className="px-4 py-2 text-slate-300">{a.event_cause}</td>
                    <td className="px-4 py-2">
                      <span className="font-bold" style={{ color: a.eis >= 80 ? '#ef4444' : a.eis >= 50 ? '#f59e0b' : '#eab308' }}>
                        {a.eis.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-300">{a.requested_officers}</td>
                    <td className="px-4 py-2 text-slate-300">{a.allocated_officers}</td>
                    <td className="px-4 py-2">
                      {a.covered
                        ? <span className="text-green-400 text-xs font-semibold">COVERED</span>
                        : <span className="text-red-400 text-xs font-semibold">SHORTFALL</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
