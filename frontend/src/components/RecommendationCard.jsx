export default function RecommendationCard({ icon, title, accent = '#f59e0b', badge, children }) {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-card"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-sm shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {icon}
          </div>
          <h3
            className="text-xs font-semibold tracking-wide uppercase"
            style={{ color: accent }}
          >
            {title}
          </h3>
        </div>
        {badge && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded"
            style={{
              background: accent + '15',
              color: accent,
              border: `1px solid ${accent}25`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  )
}
