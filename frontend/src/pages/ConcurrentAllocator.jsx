import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { api } from '../api/client'

function eisColor(eis) {
  if (eis >= 80) return '#ef4444'
  if (eis >= 50) return '#f97316'
  if (eis >= 20) return '#eab308'
  return '#10b981'
}

function UtilizationBar({ requested, pool }) {
  const pct  = Math.min(100, Math.round((requested / pool) * 100))
  const over = requested > pool
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-light" style={{ color: 'var(--text-mid)' }}>Officer utilization</span>
        <span className="font-semibold" style={{ color: over ? '#f97316' : '#f59e0b' }}>
          {requested} / {pool} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: over
              ? 'linear-gradient(90deg, #f97316, #ef4444)'
              : 'linear-gradient(90deg, #f59e0b, #f97316)',
          }}
        />
      </div>
      {over && (
        <p className="text-[11px] mt-1.5" style={{ color: '#fca5a5' }}>
          Shortfall of {requested - pool} officer-units — lowest-EIS events will go uncovered.
        </p>
      )}
    </div>
  )
}

function AllocationChart({ allocations }) {
  const data = allocations.slice(0, 8).map(a => ({
    id: a.event_id.slice(-6),
    allocated: a.allocated_officers,
    shortfall: Math.max(0, a.requested_officers - a.allocated_officers),
  }))

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <XAxis dataKey="id" tick={{ fill: 'var(--text-lo)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-lo)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          labelFormatter={l => `Event …${l}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Bar dataKey="allocated" name="Allocated" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" />
        <Bar dataKey="shortfall" name="Shortfall"  fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
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
    setLoading(true); setError(null)
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

      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-lo)' }}>
          Deploy
        </p>
        <h1 className="page-header">Concurrent Allocator</h1>
        <p className="text-[13px] font-light mt-1" style={{ color: 'var(--text-mid)' }}>
          11.5% of (station, hour) slots have ≥2 concurrent active events. One slot hit 53 concurrent.
          See who gets officers when the pool runs dry.
        </p>
      </div>

      {/* Controls */}
      <div
        className="rounded-lg p-5 mb-6 flex flex-wrap gap-5 items-end shadow-card"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>Police Station</label>
          <select className="input" value={station} onChange={e => setStation(e.target.value)}>
            {stations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-mid)' }}>
            Officer Pool: <span className="text-amber-400 font-semibold">{pool}</span>
          </label>
          <input type="range" min={1} max={60} value={pool} onChange={e => setPool(+e.target.value)} className="w-full" />
          <div className="flex justify-between mt-1">
            {['1', '30', '60'].map(v => (
              <span key={v} className="text-[10px] font-light" style={{ color: 'var(--text-lo)' }}>{v}</span>
            ))}
          </div>
        </div>
        <button onClick={run} disabled={loading || !station} className="btn-primary px-6 py-2.5">
          {loading
            ? <span className="flex items-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Running…
              </span>
            : '⚡  Stress-Test Busiest Slot'}
        </button>
      </div>

      {error && (
        <div
          className="rounded-md p-3 text-xs mb-5"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Events',        value: result.allocations.length, color: 'var(--text-hi)' },
              { label: 'Covered',       value: covered,                   color: '#10b981' },
              { label: 'Uncovered',     value: uncovered,                 color: '#ef4444' },
              { label: 'Coverage rate', value: `${coverPct}%`,            color: '#f59e0b' },
            ].map(s => (
              <div key={s.label}
                className="rounded-lg p-4 text-center shadow-card"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Window + utilization */}
          <div
            className="rounded-lg p-4 mb-5 space-y-3 shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 text-xs font-light" style={{ color: 'var(--text-mid)' }}>
              <span>Window:</span>
              <span className="font-mono font-medium" style={{ color: 'var(--text-hi)' }}>
                {result.window_start?.slice(0, 16)} — {result.window_end?.slice(0, 16)}
              </span>
            </div>
            <UtilizationBar requested={result.total_requested} pool={result.total_pool} />
          </div>

          {/* Chart */}
          <div
            className="rounded-lg p-4 mb-5 shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-mid)' }}>
              Requested vs Allocated — top 8 events by EIS
            </p>
            <AllocationChart allocations={result.allocations} />
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden shadow-card-lg" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event ID</th>
                    <th>Cause</th>
                    <th>EIS</th>
                    <th className="text-center">Requested</th>
                    <th className="text-center">Allocated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.allocations.map((a, i) => (
                    <tr
                      key={i}
                      style={!a.covered ? { background: 'rgba(239,68,68,0.04)' } : {}}
                    >
                      <td style={{ color: 'var(--text-lo)' }}>{i + 1}</td>
                      <td>
                        <span className="font-mono text-[12px]" style={{ color: 'var(--text-mid)' }}>
                          {a.event_id}
                        </span>
                      </td>
                      <td className="capitalize font-light" style={{ color: 'var(--text-mid)' }}>
                        {a.event_cause.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                            <div className="h-full rounded-full" style={{ width: `${a.eis}%`, background: eisColor(a.eis) }} />
                          </div>
                          <span className="font-semibold text-[12px] font-mono" style={{ color: eisColor(a.eis) }}>
                            {a.eis.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="text-center font-mono" style={{ color: 'var(--text-mid)' }}>{a.requested_officers}</td>
                      <td className="text-center font-mono font-semibold"
                        style={{ color: a.allocated_officers === a.requested_officers ? '#10b981' : '#f97316' }}>
                        {a.allocated_officers}
                      </td>
                      <td>
                        {a.covered
                          ? <span className="status-badge-green">✓ Covered</span>
                          : <span className="status-badge-red">✗ Shortfall</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {uncovered > 0 && (
            <div
              className="mt-4 rounded-lg p-4 shadow-card"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="text-xs font-semibold text-red-400 mb-1">Resource Contention Detected</p>
              <p className="text-[12px] font-light leading-relaxed" style={{ color: '#fca5a5' }}>
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
