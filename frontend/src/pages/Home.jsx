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
    border: 'border-t-amber-500',
    dimBg: 'rgba(245,158,11,0.05)',
  },
  {
    word: 'DEPLOY',
    icon: '🎯',
    from: 'Reactive',
    to: 'Prescriptive',
    desc: 'Concrete officer count, barricade geometry, diversion lookup. Greedy allocation under resource contention — prioritised by EIS, not by who called first.',
    link: '/allocator',
    accent: '#f97316',
    border: 'border-t-orange-500',
    dimBg: 'rgba(249,115,22,0.05)',
  },
  {
    word: 'LEARN',
    icon: '🧠',
    from: 'Amnesiac',
    to: 'Learning',
    desc: 'Post-event debrief feeds the duration model. Each closure improves the next prediction. Before/after MAE shown in real-time — not a stub.',
    link: '/debrief',
    accent: '#ef4444',
    border: 'border-t-red-500',
    dimBg: 'rgba(239,68,68,0.05)',
  },
]

const stats = [
  { value: '8,173', label: 'ASTraM Events', sub: 'Nov 2023 – Apr 2024', color: '#f59e0b' },
  { value: '44.5%', label: 'Top 10% Cells', sub: 'spatial concentration', color: '#f97316' },
  { value: '193 h', label: 'Pot-holes Median', sub: 'vs 0.7h breakdown', color: '#ef4444' },
  { value: '53×',   label: 'Peak Concurrency', sub: 'one station, one hour', color: '#a855f7' },
]

const findings = [
  { icon: '⏱', text: 'Lead time ≈ 0 for all 8,173 events — no advance impact logging exists today.' },
  { icon: '📍', text: 'Top 20% of 500m grid cells hold 64% of all events — location is learnable.' },
  { icon: '🚛', text: 'Heavy-vehicle breakdowns peak 00:00–02:00 IST; VIP movements at 10:00–12:00.' },
  { icon: '👮', text: 'Manpower deployed in only 1.6% of events — no systematic assignment exists.' },
]

export default function Home() {
  const [apiOk, setApiOk] = useState(null)

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest
          border border-amber-700/40 bg-amber-900/15 text-amber-400">
          <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7L12 4.18z"/></svg>
          Flipkart GRiD Lock 2.0 — Event-Driven Congestion
        </div>

        <h1 className="text-7xl sm:text-8xl font-black tracking-[0.18em] text-amber-400 mb-4"
          style={{ textShadow: '0 0 60px rgba(245,158,11,0.25)' }}>
          PRAHARI
        </h1>
        <p className="text-slate-400 text-lg font-medium mb-3 tracking-wide">
          Congestion Intelligence for Bengaluru's Traffic System
        </p>
        <p className="text-slate-500 text-sm mb-4">
          Built on 8,173 real ASTraM events · 5 months of ground truth · fully deployable
        </p>

        <div className="inline-flex items-center gap-2 text-sm">
          {apiOk === null
            ? <span className="text-slate-600 animate-pulse">● Connecting to backend…</span>
            : apiOk
              ? <span className="text-green-400 font-medium">● Backend connected</span>
              : <span className="text-red-400 font-medium">● Backend unreachable — start uvicorn on :8000</span>}
        </div>
      </div>

      {/* Problem statement */}
      <div className="rounded-2xl border p-6 mb-10 text-center"
        style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(17,24,39,0.8) 100%)', borderColor: 'var(--border)' }}>
        <p className="text-slate-300 leading-relaxed text-[15px] max-w-3xl mx-auto">
          Bengaluru's traffic system is{' '}
          <span className="text-amber-400 font-bold">blind</span> — not one of the 8,173 logged events had a quantified impact estimate before it started.{' '}
          <span className="text-orange-400 font-bold">Reactive</span> — manpower recorded for only 1.6% of events.{' '}
          <span className="text-red-400 font-bold">Amnesiac</span> — only 71 of 8,173 ever reach a structured resolved state.
          PRAHARI installs three layers that don't exist today.
        </p>
      </div>

      {/* Three-pillar cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {pillars.map(p => (
          <Link
            key={p.word}
            to={p.link}
            className={`group flex flex-col rounded-xl border-t-[3px] ${p.border} p-6
              transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40`}
            style={{ background: p.dimBg, borderLeft: '1px solid var(--border)',
                     borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="text-2xl mb-3">{p.icon}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 line-through font-medium">{p.from}</span>
              <span className="text-slate-600 text-xs">→</span>
              <span className="text-xs text-green-400 font-bold">{p.to}</span>
            </div>
            <h2 className="text-2xl font-black mb-3 tracking-wider" style={{ color: p.accent }}>{p.word}</h2>
            <p className="text-slate-400 text-sm leading-relaxed flex-1">{p.desc}</p>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-bold" style={{ color: p.accent }}>
              <span>Open</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-semibold text-slate-300">{s.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Key findings */}
      <div className="rounded-xl border p-5 mb-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <p className="section-eyebrow mb-4">Why this exists — 4 findings from the data</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {findings.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
              <span className="text-xl">{f.icon}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link to="/insights"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-amber-400 transition-colors group">
          <span>View all 5 EDA charts — the evidence behind every design decision</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
