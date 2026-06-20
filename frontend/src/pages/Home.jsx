import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

const pillars = [
  {
    word: 'PREDICT',
    from: 'Blind',
    to: 'Seeing',
    desc: 'Event Impact Score 0–100 + expected duration + road-closure probability in under a second.',
    link: '/triage',
    accent: '#f59e0b',
    borderClass: 'border-amber-500',
  },
  {
    word: 'DEPLOY',
    from: 'Reactive',
    to: 'Prescriptive',
    desc: 'Concrete officer count, barricade geometry, diversion lookup. Greedy allocation under resource contention.',
    link: '/allocator',
    accent: '#f97316',
    borderClass: 'border-orange-500',
  },
  {
    word: 'LEARN',
    from: 'Amnesiac',
    to: 'Learning',
    desc: 'Post-event debrief feeds the model. Each closure makes the next prediction sharper. Before/after MAE visible.',
    link: '/debrief',
    accent: '#ef4444',
    borderClass: 'border-red-500',
  },
]

const stats = [
  { value: '8,173', label: 'ASTraM events', sub: 'Nov 2023 – Apr 2024' },
  { value: '44.5%', label: 'in top 10% cells', sub: 'spatial concentration' },
  { value: '193 h', label: 'pot_holes median', sub: 'vs 0.7h breakdown' },
  { value: '53 concurrent', label: 'peak at one station', sub: 'resource contention' },
]

export default function Home() {
  const [apiOk, setApiOk] = useState(null)

  useEffect(() => {
    api.health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">

      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-widest
          border border-amber-700/40 bg-amber-900/20 text-amber-400">
          Flipkart GRiD Lock 2.0 — Event-Driven Congestion
        </div>
        <h1 className="text-6xl sm:text-7xl font-black tracking-[0.15em] text-amber-400 mb-3">
          PRAHARI
        </h1>
        <p className="text-slate-400 text-lg mb-2">
          Congestion Intelligence for Bengaluru's Traffic System
        </p>
        <p className="text-xs mt-2">
          {apiOk === null
            ? <span className="text-slate-600">checking API…</span>
            : apiOk
              ? <span className="text-green-500">● Backend connected</span>
              : <span className="text-red-400">● Backend unreachable — start uvicorn on port 8000</span>}
        </p>
      </div>

      {/* Problem statement */}
      <p className="text-center text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed text-[15px]">
        Bengaluru's traffic system is{' '}
        <span className="text-amber-400 font-semibold">blind</span> to incoming event impact,{' '}
        <span className="text-orange-400 font-semibold">reactive</span> in deploying officers,
        and <span className="text-red-400 font-semibold">amnesiac</span> after every incident closes.
        Not one of the 8,173 logged events had a quantified impact estimate before it started.
        PRAHARI installs three layers that don't exist today.
      </p>

      {/* Three-pillar cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {pillars.map(p => (
          <Link
            key={p.word}
            to={p.link}
            className={`group flex flex-col rounded-xl border-t-[3px] ${p.borderClass} p-6
              transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30`}
            style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
                     borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500 line-through">{p.from}</span>
              <span className="text-slate-600 text-xs">→</span>
              <span className="text-xs text-green-400 font-semibold">{p.to}</span>
            </div>
            <h2 className="text-2xl font-black mb-2 group-hover:opacity-90 transition-opacity"
              style={{ color: p.accent }}>{p.word}</h2>
            <p className="text-slate-400 text-sm leading-relaxed flex-1">{p.desc}</p>
            <span className="mt-4 text-xs font-semibold" style={{ color: p.accent }}>
              Open &rarr;
            </span>
          </Link>
        ))}
      </div>

      {/* Dataset stats */}
      <div
        className="rounded-xl p-6 mb-8 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <p className="section-eyebrow mb-4">Dataset at a glance</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-amber-400">{s.value}</div>
              <div className="text-xs font-semibold text-slate-300 mt-0.5">{s.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link to="/insights"
          className="text-sm text-slate-500 hover:text-amber-400 transition-colors">
          View all 5 EDA charts — the evidence behind every design decision &rarr;
        </Link>
      </div>
    </div>
  )
}
