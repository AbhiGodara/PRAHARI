import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { api } from '../api/client'

const CAUSE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#06b6d4']

function FindingBox({ icon, title, text, accent = '#f59e0b' }) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-4 py-3 border"
      style={{ background: accent + '0d', borderColor: accent + '33' }}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs font-bold mb-0.5" style={{ color: accent }}>{title}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function ChartSection({ title, subtitle, finding, children }) {
  return (
    <section className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-4 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="font-bold text-slate-100 text-sm">{title}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-5" style={{ background: 'var(--bg-card)' }}>
        {finding && (
          <div className="mb-4">{finding}</div>
        )}
        {children}
      </div>
    </section>
  )
}

function LoadingPulse() {
  return (
    <div className="space-y-4">
      {[220, 200, 180, 160, 150].map((h, i) => (
        <div key={i} className="rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="h-4 w-48 rounded bg-slate-800 animate-pulse mb-3" />
          <div className="rounded bg-slate-800/60 animate-pulse" style={{ height: h }} />
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.insights()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <span className="section-eyebrow">Evidence</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Insights</h1>
      </div>
      <LoadingPulse />
    </div>
  )

  if (!data) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="text-5xl mb-4 opacity-40">📊</div>
      <p className="text-red-400 font-medium">Failed to load insights</p>
      <p className="text-slate-600 text-sm mt-1">Check the backend is running on :8000</p>
    </div>
  )

  // Pivot hour_by_cause for recharts
  const hourCauses = [...new Set(data.hour_by_cause.map(d => d.cause))].slice(0, 6)
  const hourMap = {}
  data.hour_by_cause.forEach(d => {
    if (!hourMap[d.hour]) hourMap[d.hour] = { hour: d.hour }
    if (hourCauses.includes(d.cause)) hourMap[d.hour][d.cause] = d.count
  })
  const hourData = Array.from({ length: 24 }, (_, i) => hourMap[i] || { hour: i })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <span className="section-eyebrow">Evidence</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Insights</h1>
        <p className="text-slate-400 text-sm mt-1">
          5 key findings from 8,173 ASTraM events — the evidence behind every design decision in PRAHARI.
        </p>
      </div>

      {/* Chart 1: Hour by cause */}
      <ChartSection
        title="Events by Hour-of-Day (IST) — Top 6 Causes"
        subtitle="24-hour fingerprint of Bengaluru traffic events"
        finding={
          <FindingBox
            icon="🌙"
            title="Night goods window: 00:00–02:00 IST"
            text="Heavy-vehicle breakdowns peak at midnight–2 AM (trucks banned during day). Public events and VIP movements peak at 10:00–12:00. This hour+cause joint feature is one of the model's strongest signals."
          />
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={hourData} margin={{ left: 0, right: 10, top: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false}
              label={{ value: 'Hour (IST)', position: 'insideBottom', offset: -8, fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine x={1} stroke="#3b82f6" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: 'Night peak', fill: '#3b82f6', fontSize: 9 }} />
            <ReferenceLine x={11} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.4} label={{ value: 'Day peak', fill: '#f59e0b', fontSize: 9 }} />
            {hourCauses.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={CAUSE_COLORS[i]}
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Chart 2: Duration by cause */}
      <ChartSection
        title="Median Duration by Event Cause (hours, log scale)"
        subtitle="Why the model must treat event_cause as a first-class feature"
        finding={
          <FindingBox
            icon="⏳"
            title="3,000× duration range across causes"
            text="vehicle_breakdown clears in 0.68h. pot_holes linger for 193h. Construction runs 48h. This extreme spread means a single model without cause-stratification would be wildly inaccurate."
            accent="#f97316"
          />
        }
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={[...data.duration_by_cause].sort((a, b) => b.median_hours - a.median_hours)}
            layout="vertical"
            margin={{ left: 120, right: 50, top: 0, bottom: 0 }}
          >
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} unit="h"
              scale="log" domain={['auto', 'auto']} axisLine={false} tickLine={false} />
            <YAxis dataKey="cause" type="category" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={120}
              axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${v.toFixed(1)}h`, 'Median duration']}
            />
            <Bar dataKey="median_hours" fill="#f97316" radius={[0, 5, 5, 0]}
              background={{ fill: '#0f1e33', radius: [0, 5, 5, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Chart 3: Closure rate */}
      <ChartSection
        title="Road Closure Rate by Cause"
        subtitle="Powers the HistGradientBoostingClassifier closure model"
        finding={
          <FindingBox
            icon="🛑"
            title="vip_movement closes roads 80% of the time"
            text="vehicle_breakdown only 4%. This 20× gap gives the closure classifier a very strong signal and justifies the VIP override in the manpower rules."
            accent="#ef4444"
          />
        }
      >
        <ResponsiveContainer width="100%" height={230}>
          <BarChart
            data={[...data.closure_rate_by_cause].sort((a, b) => b.rate - a.rate)}
            layout="vertical"
            margin={{ left: 120, right: 60, top: 0, bottom: 0 }}
          >
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} axisLine={false} tickLine={false} />
            <YAxis dataKey="cause" type="category" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={120}
              axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${(v * 100).toFixed(1)}%`, 'Closure rate']}
            />
            <Bar dataKey="rate" fill="#ef4444" radius={[0, 5, 5, 0]}
              background={{ fill: '#0f1e33', radius: [0, 5, 5, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Chart 4: Spatial concentration */}
      <ChartSection
        title="Spatial Concentration Curve"
        subtitle="% of events vs % of top 500m grid cells"
        finding={
          <FindingBox
            icon="📍"
            title="Top 10% of cells hold 44.5% of events"
            text="Top 20% hold 64%. This near-Pareto distribution means location is by far the most learnable prior for impact scoring — a cell's historical event density predicts future events strongly."
            accent="#3b82f6"
          />
        }
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.spatial_concentration} margin={{ left: 0, right: 16, top: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="pct_cells" tick={{ fill: '#64748b', fontSize: 11 }} unit="%"
              label={{ value: '% of grid cells (by event density)', position: 'insideBottom', offset: -8, fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${v}%`]} />
            <ReferenceLine x={10} stroke="#f59e0b" strokeDasharray="4 2" />
            <ReferenceLine y={44.5} stroke="#f59e0b" strokeDasharray="4 2" />
            <Line type="monotone" dataKey="pct_events" stroke="#3b82f6" strokeWidth={2.5}
              dot={false} name="% of events" activeDot={{ r: 4, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Chart 5: Concurrency */}
      <ChartSection
        title="Concurrent Events per (Station, Hour) Slot"
        subtitle="The resource-contention problem the Allocator solves"
        finding={
          <FindingBox
            icon="⚡"
            title="One slot hit 53 concurrent events"
            text="11.5% of (station, hour) slots have ≥2 concurrent active events. The current system has no mechanism to prioritise or allocate across them — PRAHARI's Concurrent Allocator fills this gap."
            accent="#a855f7"
          />
        }
      >
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data.concurrency_distribution.filter(d => d.concurrent_count <= 12)}
            margin={{ left: 0, right: 16, top: 4, bottom: 16 }}
          >
            <XAxis dataKey="concurrent_count" tick={{ fill: '#64748b', fontSize: 11 }}
              label={{ value: 'Concurrent events in slot', position: 'insideBottom', offset: -8, fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={v => [v, 'slots']} labelFormatter={l => `${l} concurrent`} />
            <Bar dataKey="n_slots" fill="#a855f7" radius={[4, 4, 0, 0]}
              background={{ fill: '#0f1e33', radius: [4, 4, 0, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )
}
