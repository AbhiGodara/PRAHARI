import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/',          label: 'Home',      tag: null },
  { to: '/map',       label: 'Live Map',  tag: 'PREDICT',  tagColor: 'bg-amber-500/10 text-amber-500 border-amber-500/25' },
  { to: '/triage',    label: 'Triage',    tag: 'PREDICT',  tagColor: 'bg-amber-500/10 text-amber-500 border-amber-500/25' },
  { to: '/allocator', label: 'Allocator', tag: 'DEPLOY',   tagColor: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
  { to: '/debrief',   label: 'Debrief',   tag: 'LEARN',    tagColor: 'bg-red-500/10 text-red-400 border-red-500/25' },
  { to: '/insights',  label: 'Insights',  tag: 'DATA',     tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center h-16 px-4 sm:px-6 gap-6">

        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 py-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-amber-400">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7L12 4.18z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-amber-400 font-bold text-sm tracking-[0.18em]">PRAHARI</span>
            <span className="hidden sm:block text-[10px] font-light tracking-wide" style={{ color: 'var(--text-lo)' }}>
              Congestion Intelligence
            </span>
          </div>
        </Link>

        {/* Separator */}
        <div className="hidden sm:block h-5 w-px" style={{ background: 'var(--border)' }} />

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {links.map(l => {
            const active = pathname === l.to
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-md whitespace-nowrap transition-all duration-150 ${
                  active
                    ? 'bg-amber-500/8 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] font-normal'
                }`}
                style={active ? { background: 'rgba(245,158,11,0.08)' } : {}}
              >
                {l.label}
                {l.tag && (
                  <span className={`hidden md:inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded border tracking-wider ${
                    active ? l.tagColor : 'bg-transparent text-slate-600 border-slate-700/50'
                  }`}>
                    {l.tag}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side: divider + version info */}
        <div className="hidden lg:flex items-center gap-2 ml-auto shrink-0">
          <span className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>
            GRiD Lock 2.0
          </span>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-lo)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>API</span>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden ml-auto p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-mid)' }}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="sm:hidden px-3 py-2 space-y-0.5"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}
        >
          {links.map(l => {
            const active = pathname === l.to
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-[13px] transition-colors ${
                  active
                    ? 'text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
                style={active ? { background: 'rgba(245,158,11,0.08)' } : {}}
              >
                <span>{l.label}</span>
                {l.tag && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border tracking-wider ${
                    active ? l.tagColor : 'bg-transparent text-slate-600 border-slate-700/50'
                  }`}>
                    {l.tag}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
