export default function RecommendationCard({ icon, title, accent = '#f59e0b', children }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-lg">{icon}</span>
        <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}
