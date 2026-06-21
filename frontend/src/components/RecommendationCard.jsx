export default function RecommendationCard({ icon, title, accent = '#f59e0b', badge, children }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="text-[11px] font-bold tracking-widest uppercase" style={{ color: accent }}>
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: accent + '22', color: accent, border: `1px solid ${accent}33` }}>
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  )
}
