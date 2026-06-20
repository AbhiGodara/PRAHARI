export default function EISGauge({ score }) {
  const bands = [
    { min: 80, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'CRITICAL' },
    { min: 50, color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'HIGH' },
    { min: 20, color: '#eab308', bg: 'rgba(234,179,8,0.12)',  label: 'MODERATE' },
    { min:  0, color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'LOW' },
  ]
  const { color, bg, label } = bands.find(b => score >= b.min) || bands[3]
  const pct = Math.min(100, Math.max(0, score)) / 100
  const r = 52, cx = 64, cy = 64
  const circumference = 2 * Math.PI * r
  const dash = circumference * pct

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative w-32 h-32">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black leading-none" style={{ color }}>{Math.round(score)}</span>
          <span className="text-[10px] text-slate-500 tracking-widest mt-0.5">/100</span>
        </div>
      </div>
      <span
        className="text-xs font-bold tracking-widest px-3 py-1 rounded-full"
        style={{ color, background: bg }}
      >
        {label} IMPACT
      </span>
    </div>
  )
}
