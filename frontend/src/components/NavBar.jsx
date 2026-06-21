import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/',          label: 'Home',       tag: null,      tagColor: null },
  { to: '/map',       label: 'Live Map',   tag: 'PREDICT', tagColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { to: '/triage',    label: 'Triage',     tag: 'PREDICT', tagColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { to: '/allocator', label: 'Allocator',  tag: 'DEPLOY',  tagColor: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  { to: '/debrief',   label: 'Debrief',    tag: 'LEARN',   tagColor: 'text-red-400 bg-red-500/15 border-red-500/30' },
  { to: '/insights',  label: 'Insights',   tag: 'DATA',    tagColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-6 px-4 sm:px-6 h-14">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400 fill-current">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7L12 4.18z"/>
            </svg>
          </div>
          <span className="text-amber-500 font-black text-base tracking-[0.15em]">PRAHARI</span>
          <span className="hidden md:block text-[10px] text-slate-500 border-l border-slate-700 pl-2 font-medium tracking-wide">
            Congestion Intelligence
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-0.5 overflow-x-auto flex-1">
          {links.map(l => {
            const active = pathname === l.to
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap
                  border-b-2 transition-all duration-150 ${
                  active
                    ? 'border-amber-500 text-amber-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {l.label}
                {l.tag && (
                  <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border
                    ${active ? l.tagColor : 'bg-slate-800/60 text-slate-600 border-slate-700'}`}>
                    {l.tag}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Badge */}
        <div className="hidden lg:flex ml-auto shrink-0">
          <span className="text-[10px] text-slate-500 border border-slate-700 rounded-full px-2.5 py-1 font-medium">
            Flipkart GRiD Lock 2.0
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {links.map(l => {
            const active = pathname === l.to
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{l.label}</span>
                {l.tag && (
                  <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${active ? l.tagColor : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
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
