import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const LABELS = {
  duration_score:       'Duration Risk',
  closure_score:        'Road Closure Prob',
  location_score:       'Location Hotspot',
  concurrency_score:    'Station Pressure',
  cause_severity_score: 'Cause Severity',
}

const SEGMENT_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#a855f7', '#3b82f6']

const WEIGHTS = {
  duration_score:       30,
  closure_score:        25,
  location_score:       25,
  concurrency_score:    15,
  cause_severity_score: 5,
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-dropdown"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <p className="font-medium mb-1" style={{ color: 'var(--text-hi)' }}>{d.name}</p>
      <p style={{ color: d.fill }}>Score: <strong>{d.value.toFixed(1)}</strong> / 100</p>
      <p className="mt-0.5" style={{ color: 'var(--text-lo)' }}>Weight: {d.weight}% of EIS</p>
    </div>
  )
}

export default function ComponentBreakdown({ components }) {
  if (!components) return null

  const data = Object.entries(components).map(([k, v], i) => ({
    name: LABELS[k] || k,
    value: Math.round(parseFloat(v) * 10) / 10,
    fill: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    weight: WEIGHTS[k] || 0,
  }))

  return (
    <div
      className="rounded-lg shadow-card"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
          EIS Component Breakdown
        </p>
        <p className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>
          5 weighted signals
        </p>
      </div>
      <div className="px-4 pt-3 pb-4">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} layout="vertical" margin={{ left: 118, right: 36, top: 0, bottom: 0 }}>
            <XAxis
              type="number" domain={[0, 100]}
              tick={{ fill: '#485872', fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              dataKey="name" type="category"
              tick={{ fill: '#8a9ab3', fontSize: 11 }}
              width={118} axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} background={{ fill: 'rgba(255,255,255,0.03)', radius: [0, 3, 3, 0] }}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* weight row */}
        <div className="flex flex-wrap gap-3 mt-1 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-lo)' }}>
              <span className="w-2 h-2 rounded-sm" style={{ background: d.fill, opacity: 0.8 }} />
              <span>{d.weight}% wt</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
