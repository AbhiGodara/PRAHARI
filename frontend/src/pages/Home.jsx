import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const pillars = [
  {
    word: 'PREDICT',
    icon: '🔭',
    from: 'Blind',
    to: 'Seeing',
    desc: 'Event Impact Score 0–100 + expected duration + road-closure probability in under a second. Every event scored before the first officer moves.',
    link: '/triage',
    accent: '#f59e0b',
    borderTop: '2px solid #f59e0b',
  },
  {
    word: 'DEPLOY',
    icon: '🎯',
    from: 'Reactive',
    to: 'Prescriptive',
    desc: 'Concrete officer count, barricade geometry, diversion lookup. Greedy allocation under resource contention — prioritised by EIS, not by who called first.',
    link: '/allocator',
    accent: '#f97316',
    borderTop: '2px solid #f97316',
  },
  {
    word: 'LEARN',
    icon: '🧠',
    from: 'Amnesiac',
    to: 'Learning',
    desc: 'Post-event debrief feeds the duration model. Each closure improves the next prediction. Before/after MAE shown in real-time — not a stub.',
    link: '/debrief',
    accent: '#ef4444',
    borderTop: '2px solid #ef4444',
  },
]

const stats = [
  { value: '8,173', label: 'ASTraM Events',     sub: 'Nov 2023 – Apr 2024',  color: '#f59e0b' },
  { value: '44.5%', label: 'Top 10% Grid Cells', sub: 'spatial concentration', color: '#f97316' },
  { value: '193 h', label: 'Pot-holes Median',   sub: 'vs 0.68h breakdown',   color: '#ef4444' },
  { value: '53×',   label: 'Peak Concurrency',   sub: 'one station, one hour', color: '#a855f7' },
]

const findings = [
  { icon: '⏱', text: 'Lead time ≈ 0 for all 8,173 events — no advance impact logging exists today.' },
  { icon: '📍', text: 'Top 20% of 500m grid cells hold 64% of all events — location is a learnable prior.' },
  { icon: '🚛', text: 'Heavy-vehicle breakdowns peak 00:00–02:00 IST; VIP movements peak 10:00–12:00.' },
  { icon: '👮', text: 'Manpower deployed in only 1.6% of events — no systematic assignment exists today.' },
]

export default function Home() {
  const [apiOk, setApiOk] = useState(null)

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="text-center mb-12">
        <div
          className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wider"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-lo)' }}
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-amber-400 shrink-0">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7L12 4.18z"/>
          </svg>
          Flipkart GRiD Lock 2.0 — Event-Driven Congestion
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-[0.14em] text-amber-400 mb-4">
          PRAHARI
        </h1>
        <p className="text-base font-light mb-2" style={{ color: 'var(--text-mid)' }}>
          Congestion Intelligence for Bengaluru's Traffic System
        </p>
        <p className="text-xs mb-4 font-light" style={{ color: 'var(--text-lo)' }}>
          8,173 real ASTraM events · 5 months of ground truth · fully deployable
        </p>

        <div className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text-lo)' }}>
          {apiOk === null
            ? <span className="animate-pulse">Connecting to backend…</span>
            : apiOk
              ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Backend connected</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Backend unreachable — start uvicorn on :8000</>}
        </div>
      </div>

      {/* Problem statement */}
      <div
        className="rounded-lg p-5 mb-10 shadow-card"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-[13px] leading-relaxed text-center" style={{ color: 'var(--text-mid)' }}>
          Bengaluru's traffic system is{' '}
          <span className="text-amber-400 font-medium">blind</span> — not one of the 8,173 logged events had a
          quantified impact estimate before it started.{' '}
          <span className="text-orange-400 font-medium">Reactive</span> — manpower recorded for only 1.6% of events.{' '}
          <span className="text-red-400 font-medium">Amnesiac</span> — only 71 of 8,173 ever reach a structured
          resolved state. PRAHARI installs three layers that don't exist today.
        </p>
      </div>

      {/* Three-pillar cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {pillars.map(p => (
          <Link
            key={p.word}
            to={p.link}
            className="group flex flex-col rounded-lg p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderTop: p.borderTop,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            <div className="text-xl mb-3">{p.icon}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-light line-through" style={{ color: 'var(--text-lo)' }}>{p.from}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-lo)' }}>→</span>
              <span className="text-[11px] font-medium text-emerald-400">{p.to}</span>
            </div>
            <h2 className="text-lg font-bold mb-2.5 tracking-wide" style={{ color: p.accent }}>{p.word}</h2>
            <p className="text-[13px] leading-relaxed flex-1 font-light" style={{ color: 'var(--text-mid)' }}>{p.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: p.accent }}>
              <span>Open</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {stats.map(s => (
          <div
            key={s.label}
            className="rounded-lg p-4 text-center shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-hi)' }}>{s.label}</div>
            <div className="text-[10px] font-light" style={{ color: 'var(--text-lo)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Key findings */}
      <div
        className="rounded-lg p-5 mb-8 shadow-card"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-mid)' }}>
          Why this exists — 4 findings from the data
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {findings.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-md"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)' }}
            >
              <span className="text-lg leading-none mt-0.5">{f.icon}</span>
              <p className="text-[12px] leading-relaxed font-light" style={{ color: 'var(--text-mid)' }}>{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/insights"
          className="inline-flex items-center gap-2 text-xs font-medium transition-colors group"
          style={{ color: 'var(--text-lo)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f59e0b'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-lo)'}
        >
          <span>View all 5 EDA charts — the evidence behind every design decision</span>
          <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

    </div>
  )
}
