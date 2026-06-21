import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { api } from '../api/client'

function eisColor(eis) {
  if (eis >= 80) return '#ef4444'
  if (eis >= 50) return '#f97316'
  if (eis >= 20) return '#eab308'
  return '#22c55e'
}

function UtilizationBar({ requested, pool }) {
  const pct = Math.min(100, Math.round((requested / pool) * 100))
  const over = requested > pool
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400">Officer utilization</span>
        <span className={`font-bold ${over ? 'text-red-400' : 'text-amber-400'}`}>
          {requested} / {pool} ({pct}%)
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: over ? 'linear-gradient(90deg, #f97316, #ef4444)' : 'linear-gradient(90deg, #f59e0b, #f97316)',
          }}
        />
      </div>
      {over && (
        <p className="text-[11px] text-red-400 mt-1">
          ⚠ Shortfall of {requested - pool} officers — {requested - pool} officer-units unmet
        </p>
      )}
    </div>
  )
}

function AllocationChart({ allocations }) {
  const data = allocations.slice(0, 8).map(a => ({
    id: a.event_id.slice(-6),
    requested: a.requested_officers,
    allocated: a.allocated_officers,
    shortfall: Math.max(0, a.requested_officers - a.allocated_officers),
    eis: a.eis,
    cause: a.event_cause,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
        <XAxis dataKey="id" tick={{ fill: '#64748b', fontSize: 10 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Officers', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
          formatter={(v, name) => [v, name]}
          labelFormatter={l => `Event ${l}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        <Bar dataKey="allocated" name="Allocated" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="shortfall" name="Shortfall" fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function ConcurrentAllocator() {
  const [stations, setStations] = useState([])
  const [station, setStation]   = useState('')
  const [pool, setPool]         = useState(20)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    api.stations()
      .then(d => { setStations(d.stations); setStation(d.stations[0] || '') })
      .catch(() => {})
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

  const covered   = result?.allocations.filter(a => a.covered).length ?? 0
  const uncovered = result?.allocations.filter(a => !a.covered).length ?? 0
  const coverPct  = result ? Math.round((covered / result.allocations.length) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <span className="section-eyebrow">DEPLOY</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Concurrent Allocator</h1>
        <p className="text-slate-400 text-sm mt-1">
          11.5% of (station, hour) slots have ≥2 concurrent active events. One slot hit 53 concurrent.
          See who gets officers when the pool runs out.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border p-5 mb-6 flex flex-wrap gap-5 items-end"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Police Station</label>
          <select className="input" value={station} onChange={e => setStation(e.target.value)}>
            {stations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            Officer Pool: <span className="text-amber-400 font-bold">{pool}</span>
          </label>
          <input type="range" min={1} max={60} value={pool}
            onChange={e => setPool(+e.target.value)}
            className="w-full accent-amber-500" />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>1</span><span>30</span><span>60</span>
          </div>
        </div>
        <button onClick={run} disabled={loading || !station}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm
            rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30
            disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Running…</span> : '⚡ Stress-Test Busiest Slot'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-800 p-3 text-xs text-red-400 mb-4">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black text-slate-200">{result.allocations.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Events</div>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ background: 'rgba(34,197,94,0.05)', borderColor: '#166534' }}>
              <div className="text-2xl font-black text-green-400">{covered}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Covered</div>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ background: 'rgba(239,68,68,0.05)', borderColor: '#7f1d1d' }}>
              <div className="text-2xl font-black text-red-400">{uncovered}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Uncovered</div>
            </div>
            <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black text-amber-400">{coverPct}%</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Coverage rate</div>
            </div>
          </div>

          {/* Window + utilization */}
          <div className="rounded-xl border p-4 mb-5 space-y-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>📅 Window:</span>
              <span className="text-slate-200 font-medium font-mono">
                {result.window_start?.slice(0, 16)} — {result.window_end?.slice(0, 16)}
              </span>
            </div>
            <UtilizationBar requested={result.total_requested} pool={result.total_pool} />
          </div>

          {/* Allocation chart */}
          <div className="rounded-xl border p-4 mb-5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="section-eyebrow mb-3">Requested vs Allocated (top 8 by EIS)</p>
            <AllocationChart allocations={result.allocations} />
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-card)' }} className="text-slate-400 text-left">
                    <th className="px-4 py-3 text-xs font-semibold">#</th>
                    <th className="px-4 py-3 text-xs font-semibold">Event ID</th>
                    <th className="px-4 py-3 text-xs font-semibold">Cause</th>
                    <th className="px-4 py-3 text-xs font-semibold">EIS</th>
                    <th className="px-4 py-3 text-xs font-semibold">Requested</th>
                    <th className="px-4 py-3 text-xs font-semibold">Allocated</th>
                    <th className="px-4 py-3 text-xs font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.allocations.map((a, i) => (
                    <tr
                      key={i}
                      className="border-t transition-colors"
                      style={{
                        borderColor: 'var(--border)',
                        background: !a.covered ? 'rgba(239,68,68,0.05)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.event_id}</td>
                      <td className="px-4 py-2.5 text-slate-300 text-xs capitalize">{a.event_cause.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${a.eis}%`, background: eisColor(a.eis) }} />
                          </div>
                          <span className="font-bold text-xs" style={{ color: eisColor(a.eis) }}>
                            {a.eis.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 text-xs text-center">{a.requested_officers}</td>
                      <td className="px-4 py-2.5 text-xs text-center">
                        <span className={`font-bold ${a.allocated_officers === a.requested_officers ? 'text-green-400' : 'text-orange-400'}`}>
                          {a.allocated_officers}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {a.covered
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-950/50 border border-green-900 px-2 py-0.5 rounded-full">✓ COVERED</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-900 px-2 py-0.5 rounded-full">✗ SHORTFALL</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {uncovered > 0 && (
            <div className="mt-4 rounded-lg bg-red-950/30 border border-red-900/50 p-4">
              <p className="text-xs text-red-400 font-bold mb-1">⚠ Resource Contention Detected</p>
              <p className="text-xs text-red-500 leading-relaxed">
                {uncovered} event{uncovered > 1 ? 's' : ''} cannot be adequately covered with {pool} officers.
                Events are prioritised by EIS — highest-impact events are covered first.
                Increase the officer pool or escalate to the control room.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
