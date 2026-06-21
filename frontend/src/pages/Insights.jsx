import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { api } from '../api/client'

const CAUSE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4']

function FindingBox({ icon, title, text, accent = '#f59e0b' }) {
  return (
    <div
      className="flex items-start gap-3 rounded-md p-3 mb-4"
      style={{ background: accent + '0a', border: `1px solid ${accent}25` }}
    >
      <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold mb-0.5" style={{ color: accent }}>{title}</p>
        <p className="text-[12px] font-light leading-relaxed" style={{ color: 'var(--text-mid)' }}>{text}</p>
      </div>
    </div>
  )
}

function ChartSection({ title, subtitle, finding, children }) {
  return (
    <section className="rounded-lg overflow-hidden shadow-card" style={{ border: '1px solid var(--border)' }}>
      <div
        className="px-5 py-3.5"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>{title}</h2>
        <p className="text-xs font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>{subtitle}</p>
      </div>
      <div className="p-5" style={{ background: 'var(--bg-card)' }}>
        {finding}
        {children}
      </div>
    </section>
  )
}

function Skeleton({ h = 200 }) {
  return <div className="rounded-md animate-pulse" style={{ height: h, background: 'var(--bg-elevated)' }} />
}

export default function Insights() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.insights()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-lo)' }}>Evidence</p>
        <h1 className="page-header">Insights</h1>
      </div>
      <div className="space-y-5">
        {[220, 200, 180, 160, 150].map((h, i) => (
          <div key={i} className="rounded-lg p-5 shadow-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="h-3 w-40 rounded mb-4 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
            <Skeleton h={h} />
          </div>
        ))}
      </div>
    </div>
  )

  if (!data) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="text-5xl mb-4 opacity-30">📊</div>
      <p className="text-sm font-medium text-red-400">Failed to load insights</p>
      <p className="text-xs font-light mt-1" style={{ color: 'var(--text-lo)' }}>Check the backend is running on :8000</p>
    </div>
  )

  // Build hourly chart data
  const hourCauses = [...new Set(data.hour_by_cause.map(d => d.cause))].slice(0, 6)
  const hourMap = {}
  data.hour_by_cause.forEach(d => {
    if (!hourMap[d.hour]) hourMap[d.hour] = { hour: d.hour }
    if (hourCauses.includes(d.cause)) hourMap[d.hour][d.cause] = d.count
  })
  const hourData = Array.from({ length: 24 }, (_, i) => hourMap[i] || { hour: i })

  const chartTooltipStyle = {
    contentStyle: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 11,
    },
  }
  const axisTickStyle = { fill: 'var(--text-lo)', fontSize: 11 }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-lo)' }}>
          Evidence
        </p>
        <h1 className="page-header">Insights</h1>
        <p className="text-[13px] font-light mt-1" style={{ color: 'var(--text-mid)' }}>
          5 key findings from 8,173 ASTraM events — the evidence behind every design decision in PRAHARI.
        </p>
      </div>

      {/* 1: Hour by cause */}
      <ChartSection
        title="Events by Hour-of-Day (IST) — Top 6 Causes"
        subtitle="24-hour fingerprint; distinct night vs. daytime patterns"
        finding={
          <FindingBox
            icon="🌙"
            title="Night goods window: 00:00–02:00 IST"
            text="Heavy-vehicle breakdowns peak at midnight–2 AM (trucks restricted during day). Public events and VIP movements peak at 10:00–12:00. This hour + cause joint feature is one of the model's strongest signals."
          />
        }
      >
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={hourData} margin={{ left: 0, right: 8, top: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="hour" tick={axisTickStyle} tickLine={false}
              label={{ value: 'Hour (IST)', position: 'insideBottom', offset: -8, fill: 'var(--text-lo)', fontSize: 11 }} />
            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <ReferenceLine x={1}  stroke="#3b82f6" strokeDasharray="4 2" strokeOpacity={0.5} />
            <ReferenceLine x={11} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.5} />
            {hourCauses.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={CAUSE_COLORS[i]}
                strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* 2: Duration by cause */}
      <ChartSection
        title="Median Duration by Event Cause (hours, log scale)"
        subtitle="Why event_cause must be a first-class model feature"
        finding={
          <FindingBox
            icon="⏳"
            title="3,000× duration range across causes"
            text="vehicle_breakdown clears in 0.68h. pot_holes linger for 193h. Construction 48h. This extreme spread means any model without cause-stratification would be wildly inaccurate."
            accent="#f97316"
          />
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={[...data.duration_by_cause].sort((a, b) => b.median_hours - a.median_hours)}
            layout="vertical"
            margin={{ left: 120, right: 48, top: 0, bottom: 0 }}
          >
            <XAxis type="number" tick={axisTickStyle} unit="h" scale="log" domain={['auto', 'auto']} axisLine={false} tickLine={false} />
            <YAxis dataKey="cause" type="category" tick={{ fill: 'var(--text-mid)', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltipStyle} formatter={v => [`${v.toFixed(1)}h`, 'Median']} />
            <Bar dataKey="median_hours" fill="#f97316" radius={[0, 4, 4, 0]}
              background={{ fill: 'rgba(255,255,255,0.03)', radius: [0, 4, 4, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* 3: Closure rate */}
      <ChartSection
        title="Road Closure Rate by Cause"
        subtitle="Powers the RF closure classifier — ROC-AUC 0.80"
        finding={
          <FindingBox
            icon="🛑"
            title="vip_movement closes roads 80% of the time; vehicle_breakdown only 4%"
            text="This 20× gap gives the closure model a very strong signal and justifies the VIP override in the manpower rules."
            accent="#ef4444"
          />
        }
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={[...data.closure_rate_by_cause].sort((a, b) => b.rate - a.rate)}
            layout="vertical"
            margin={{ left: 120, right: 56, top: 0, bottom: 0 }}
          >
            <XAxis type="number" tick={axisTickStyle}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} axisLine={false} tickLine={false} />
            <YAxis dataKey="cause" type="category" tick={{ fill: 'var(--text-mid)', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltipStyle} formatter={v => [`${(v * 100).toFixed(1)}%`, 'Closure rate']} />
            <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]}
              background={{ fill: 'rgba(255,255,255,0.03)', radius: [0, 4, 4, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* 4: Spatial concentration */}
      <ChartSection
        title="Spatial Concentration Curve"
        subtitle="% of all events vs % of top 500m grid cells"
        finding={
          <FindingBox
            icon="📍"
            title="Top 10% of cells hold 44.5% of events; top 20% hold 64%"
            text="Near-Pareto distribution. A cell's historical event density is by far the most learnable prior for impact scoring — exploited in the empirical-Bayes location priors."
            accent="#3b82f6"
          />
        }
      >
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={data.spatial_concentration} margin={{ left: 0, right: 12, top: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="pct_cells" tick={axisTickStyle} unit="%"
              label={{ value: '% of grid cells (ranked by density)', position: 'insideBottom', offset: -8, fill: 'var(--text-lo)', fontSize: 11 }} />
            <YAxis tick={axisTickStyle} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltipStyle} formatter={v => [`${v}%`]} />
            <ReferenceLine x={10} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.5} />
            <ReferenceLine y={44.5} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="pct_events" stroke="#3b82f6" strokeWidth={2}
              dot={false} name="% of events" activeDot={{ r: 3, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* 5: Concurrency */}
      <ChartSection
        title="Concurrent Events per (Station, Hour) Slot"
        subtitle="The resource-contention problem the Allocator solves"
        finding={
          <FindingBox
            icon="⚡"
            title="One slot hit 53 concurrent events; 11.5% of slots have ≥2"
            text="The current system has no mechanism to prioritise allocation across concurrent events. PRAHARI's Concurrent Allocator fills this gap using EIS-ranked greedy assignment."
            accent="#a855f7"
          />
        }
      >
        <ResponsiveContainer width="100%" height={170}>
          <BarChart
            data={data.concurrency_distribution.filter(d => d.concurrent_count <= 12)}
            margin={{ left: 0, right: 12, top: 4, bottom: 16 }}
          >
            <XAxis dataKey="concurrent_count" tick={axisTickStyle}
              label={{ value: 'Concurrent events in slot', position: 'insideBottom', offset: -8, fill: 'var(--text-lo)', fontSize: 11 }} />
            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltipStyle} formatter={v => [v, 'slots']} labelFormatter={l => `${l} concurrent`} />
            <Bar dataKey="n_slots" fill="#a855f7" radius={[3, 3, 0, 0]}
              background={{ fill: 'rgba(255,255,255,0.03)', radius: [3, 3, 0, 0] }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  )
}
