import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const LABELS = {
  duration_score:       'Duration',
  closure_score:        'Road Closure Prob.',
  location_score:       'Location Risk',
  concurrency_score:    'Station Pressure',
  cause_severity_score: 'Cause Severity',
}

const COLORS = ['#f59e0b', '#f97316', '#ef4444', '#a855f7', '#3b82f6']

export default function ComponentBreakdown({ components }) {
  if (!components) return null
  const data = Object.entries(components).map(([k, v], i) => ({
    name: LABELS[k] || k,
    value: parseFloat(v.toFixed(1)),
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <p className="section-eyebrow mb-3">EIS Component Breakdown</p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} layout="vertical" margin={{ left: 110, right: 30, top: 0, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#f1f5f9' }}
            formatter={v => [`${v.toFixed(1)} / 100`, '']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
