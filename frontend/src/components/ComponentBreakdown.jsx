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
  duration_score: 30,
  closure_score: 25,
  location_score: 25,
  concurrency_score: 15,
  cause_severity_score: 5,
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <p className="font-semibold text-slate-200 mb-1">{d.name}</p>
      <p style={{ color: d.fill }}>Score: <strong>{d.value.toFixed(1)}</strong> / 100</p>
      <p className="text-slate-500 mt-0.5">Weight: {d.weight}% of EIS</p>
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
    key: k,
  }))

  return (
    <div className="rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="px-4 pt-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="section-eyebrow">EIS Component Breakdown</p>
        <p className="text-[11px] text-slate-500 mt-0.5">5 weighted signals → final 0–100 score</p>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={175}>
          <BarChart data={data} layout="vertical" margin={{ left: 118, right: 36, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={118} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} background={{ fill: '#0f1e33', radius: [0, 4, 4, 0] }}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.9} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* weight legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: d.fill }} />
              <span>{d.weight}% wt</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
