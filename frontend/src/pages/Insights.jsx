import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { api } from '../api/client'

export default function Insights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.insights().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-12 text-slate-500 text-center">Loading insights…</div>
  if (!data) return <div className="p-12 text-red-400 text-center">Failed to load insights.</div>

  // Pivot hour_by_cause for recharts
  const hourCauses = [...new Set(data.hour_by_cause.map(d => d.cause))].slice(0, 5)
  const hourMap = {}
  data.hour_by_cause.forEach(d => {
    if (!hourMap[d.hour]) hourMap[d.hour] = { hour: d.hour }
    if (hourCauses.includes(d.cause)) hourMap[d.hour][d.cause] = d.count
  })
  const hourData = Array.from({ length: 24 }, (_, i) => hourMap[i] || { hour: i })

  const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7']

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
      <div>
        <span className="text-xs text-amber-500 uppercase tracking-widest">Evidence</span>
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Insights</h1>
        <p className="text-slate-400 text-sm">5 key findings from 8,173 ASTraM events — the evidence behind every design decision.</p>
      </div>

      {/* Chart 1: Hour by cause */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-1">Events by Hour-of-Day (IST) — Top 5 Causes</h2>
        <p className="text-xs text-slate-500 mb-4">Heavy-vehicle breakdowns peak at 0–2 AM (night goods window). Public events and VIP movements peak at 10–12 AM. This fingerprint powers the PREDICT layer.</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={hourData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Hour (IST)', position: 'insideBottom', fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {hourCauses.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 2: Duration by cause */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-1">Median Duration by Cause (hours)</h2>
        <p className="text-xs text-slate-500 mb-4">Construction lingers 48h; pot_holes 193h. vehicle_breakdown clears in 0.7h. This spread forces the model to use event_cause as a first-class feature.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[...data.duration_by_cause].sort((a, b) => b.median_hours - a.median_hours)} layout="vertical" margin={{ left: 110 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="h" scale="log" domain={['auto', 'auto']} />
            <YAxis dataKey="cause" type="category" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={110} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} formatter={v => [`${v.toFixed(1)}h`, 'Median']} />
            <Bar dataKey="median_hours" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 3: Closure rate by cause */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-1">Road Closure Rate by Cause</h2>
        <p className="text-xs text-slate-500 mb-4">VIP movement: 80% road closure. vehicle_breakdown: 4%. This patterns the closure model's strong ROC-AUC.</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[...data.closure_rate_by_cause].sort((a, b) => b.rate - a.rate)} layout="vertical" margin={{ left: 110 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${(v*100).toFixed(0)}%`} domain={[0, 1]} />
            <YAxis dataKey="cause" type="category" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={110} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} formatter={v => [`${(v*100).toFixed(1)}%`, 'Rate']} />
            <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 4: Spatial concentration */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-1">Spatial Concentration Curve</h2>
        <p className="text-xs text-slate-500 mb-4">Top 10% of ~500m grid cells hold 44.5% of all events. Top 20% hold 64%. Location is the single strongest learnable prior.</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.spatial_concentration}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="pct_cells" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} formatter={v => [`${v}%`]} />
            <Line type="monotone" dataKey="pct_events" stroke="#f59e0b" strokeWidth={2} dot={false} name="% of events" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Chart 5: Concurrency distribution */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="font-semibold text-slate-200 mb-1">Concurrent Events per Station-Hour</h2>
        <p className="text-xs text-slate-500 mb-4">11.5% of (station, hour) slots have ≥2 concurrent events. One slot hit 53. This is the resource-contention problem the Allocator solves.</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.concurrency_distribution.filter(d => d.concurrent_count <= 10)}>
            <XAxis dataKey="concurrent_count" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Concurrent events', position: 'insideBottom', fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} formatter={v => [v, 'slots']} />
            <Bar dataKey="n_slots" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
