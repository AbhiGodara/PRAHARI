import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/',          label: 'Home' },
  { to: '/map',       label: 'Live Map',   tag: 'PREDICT' },
  { to: '/triage',    label: 'Triage',     tag: 'PREDICT' },
  { to: '/allocator', label: 'Allocator',  tag: 'DEPLOY' },
  { to: '/debrief',   label: 'Debrief',    tag: 'LEARN' },
  { to: '/insights',  label: 'Insights',   tag: 'DATA' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav
      className="sticky top-0 z-50 border-b flex items-center gap-8 px-6 py-0"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2 py-3 shrink-0">
        <span className="text-amber-500 font-black text-lg tracking-[0.2em]">PRAHARI</span>
        <span className="hidden sm:block text-xs text-slate-500 border-l border-slate-700 pl-2 ml-1">
          Congestion Intelligence
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {links.map(l => {
          const active = pathname === l.to
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`relative flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap
                border-b-2 transition-colors ${
                active
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {l.label}
              {l.tag && (
                <span className={`text-[9px] font-bold tracking-wider px-1 py-0.5 rounded
                  ${active ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/60 text-slate-500'}`}>
                  {l.tag}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
