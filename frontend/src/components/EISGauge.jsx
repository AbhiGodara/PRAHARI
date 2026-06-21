export default function EISGauge({ score, size = 'lg' }) {
  const bands = [
    { min: 80, color: '#ef4444', glow: 'rgba(239,68,68,0.3)',  bg: 'rgba(239,68,68,0.08)',  label: 'CRITICAL' },
    { min: 50, color: '#f97316', glow: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.08)', label: 'HIGH' },
    { min: 20, color: '#eab308', glow: 'rgba(234,179,8,0.3)',  bg: 'rgba(234,179,8,0.08)',  label: 'MODERATE' },
    { min:  0, color: '#22c55e', glow: 'rgba(34,197,94,0.3)',  bg: 'rgba(34,197,94,0.08)',  label: 'LOW' },
  ]
  const band = bands.find(b => score >= b.min) || bands[3]
  const { color, glow, bg, label } = band
  const pct = Math.min(100, Math.max(0, score)) / 100
  const isLg = size === 'lg'
  const dim = isLg ? 148 : 112
  const r   = isLg ? 60  : 46
  const cx  = dim / 2
  const cy  = dim / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * pct

  return (
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <defs>
            <filter id="eis-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={isLg ? 11 : 9} />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={isLg ? 11 : 9}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            filter="url(#eis-glow)"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${glow})` }}
          />
        </svg>
        {/* Centre content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-black leading-none ${isLg ? 'text-5xl' : 'text-4xl'}`} style={{ color }}>
            {Math.round(score)}
          </span>
          <span className="text-[10px] text-slate-500 tracking-widest font-medium mt-0.5">/100</span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-widest"
        style={{ color, background: bg, borderColor: color + '33' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {label} IMPACT
      </div>
    </div>
  )
}
