export default function EISGauge({ score, size = 'lg' }) {
  const bands = [
    { min: 80, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Critical' },
    { min: 50, color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'High' },
    { min: 20, color: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.2)',  label: 'Moderate' },
    { min:  0, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Low' },
  ]
  const band = bands.find(b => score >= b.min) || bands[3]
  const { color, bg, border, label } = band

  const pct = Math.min(100, Math.max(0, score)) / 100
  const isLg = size === 'lg'
  const dim  = isLg ? 144 : 108
  const r    = isLg ? 58  : 44
  const cx   = dim / 2
  const cy   = dim / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * pct

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#1a2235"
            strokeWidth={isLg ? 10 : 8}
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={isLg ? 10 : 8}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        {/* Centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold leading-none ${isLg ? 'text-[2.75rem]' : 'text-[2rem]'}`} style={{ color }}>
            {Math.round(score)}
          </span>
          <span className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>/100</span>
        </div>
      </div>
      {/* Badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold"
        style={{ color, background: bg, border: `1px solid ${border}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label} Impact
      </div>
    </div>
  )
}
