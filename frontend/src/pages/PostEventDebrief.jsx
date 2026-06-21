import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { api } from '../api/client'

const DEFAULT_FORM = {
  actual_duration_hours: '',
  officers_used: '',
  diversion_used: false,
  accuracy_rating: 3,
  notes: '',
}

function AccuracyStars({ value, onChange }) {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className="w-8 h-8 rounded font-semibold text-sm transition-all duration-150"
          style={value >= n
            ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }
            : { background: 'var(--bg-base)', color: 'var(--text-lo)', border: '1px solid var(--border)' }
          }
        >
          {n}
        </button>
      ))}
      <span className="text-[11px] font-light ml-1" style={{ color: 'var(--text-lo)' }}>
        {labels[value]}
      </span>
    </div>
  )
}

function ImprovementBadge({ before, after }) {
  const delta    = before - after
  const pct      = ((Math.abs(delta) / before) * 100).toFixed(1)
  const improved = delta > 0
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded"
      style={improved
        ? { background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }
        : { background: 'rgba(239,68,68,0.08)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
      }
    >
      {improved ? '▼' : '▲'} {pct}% {improved ? 'improvement' : 'regression'}
    </span>
  )
}

export default function PostEventDebrief() {
  const [pending, setPending]             = useState([])
  const [selected, setSelected]           = useState('')
  const [form, setForm]                   = useState(DEFAULT_FORM)
  const [submitResult, setSubmitResult]   = useState(null)
  const [retrainResult, setRetrainResult] = useState(null)
  const [loading, setLoading]             = useState(false)
  const [retraining, setRetraining]       = useState(false)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    api.pendingDebriefs()
      .then(d => { setPending(d.events); if (d.events.length) setSelected(d.events[0].event_id) })
      .catch(() => {})
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submitDebrief(e) {
    e.preventDefault()
    setLoading(true); setError(null); setSubmitResult(null)
    try {
      await api.submitDebrief({
        event_id: selected,
        actual_duration_hours: parseFloat(form.actual_duration_hours),
        officers_used: parseInt(form.officers_used),
        diversion_used: form.diversion_used,
        accuracy_rating: form.accuracy_rating,
        notes: form.notes || null,
      })
      setSubmitResult(true)
      setForm(DEFAULT_FORM)
      api.pendingDebriefs()
        .then(d => { setPending(d.events); if (d.events.length) setSelected(d.events[0].event_id) })
        .catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function retrain() {
    setRetraining(true); setError(null); setRetrainResult(null)
    try {
      const r = await api.retrain()
      setRetrainResult(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setRetraining(false)
    }
  }

  const selectedEvent = pending.find(e => e.event_id === selected)
  const predDuration  = selectedEvent?.predicted_duration_hours ?? null
  const actDuration   = form.actual_duration_hours ? parseFloat(form.actual_duration_hours) : null
  const durationErr   = predDuration && actDuration ? Math.abs(actDuration - predDuration).toFixed(1) : null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-lo)' }}>
          Learn
        </p>
        <h1 className="page-header">Post-Event Debrief</h1>
        <p className="text-[13px] font-light mt-1" style={{ color: 'var(--text-mid)' }}>
          Record what actually happened. Each debrief improves future predictions.
        </p>
      </div>

      {pending.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center shadow-card"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-4 opacity-30">📋</div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-mid)' }}>No pending debriefs</p>
          <p className="text-xs font-light mt-1" style={{ color: 'var(--text-lo)' }}>
            Run a triage on the Event Triage page first
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Event selector */}
          <div
            className="rounded-lg p-4 shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <label className="block text-[11px] font-medium mb-2" style={{ color: 'var(--text-mid)' }}>
              Select triaged event
            </label>
            <select className="input" value={selected}
              onChange={e => { setSelected(e.target.value); setSubmitResult(null) }}>
              {pending.map(e => (
                <option key={e.event_id} value={e.event_id}>
                  {e.event_id} — {e.event_cause.replace(/_/g, ' ')} · EIS {e.eis.toFixed(1)} · predicted {e.predicted_duration_hours.toFixed(1)}h
                </option>
              ))}
            </select>
            {selectedEvent && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: 'Cause',              value: selectedEvent.event_cause.replace(/_/g, ' '), color: 'var(--text-hi)' },
                  { label: 'Predicted duration', value: `${selectedEvent.predicted_duration_hours.toFixed(1)}h`, color: '#f59e0b' },
                  { label: 'EIS score',          value: selectedEvent.eis.toFixed(1),
                    color: selectedEvent.eis >= 80 ? '#ef4444' : selectedEvent.eis >= 50 ? '#f97316' : '#eab308' },
                ].map(s => (
                  <div key={s.label}
                    className="rounded-md p-2.5 text-center"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                    <div className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <form
            onSubmit={submitDebrief}
            className="rounded-lg p-5 space-y-4 shadow-card"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold pb-2.5" style={{ color: 'var(--text-mid)', borderBottom: '1px solid var(--border-subtle)' }}>
              Debrief Details
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-mid)' }}>
                  Actual Duration (hours)
                </label>
                <input type="number" step="0.1" min="0" required className="input"
                  value={form.actual_duration_hours}
                  onChange={e => set('actual_duration_hours', e.target.value)} />
                {durationErr && (
                  <p className="text-[10px] mt-1 font-light" style={{ color: parseFloat(durationErr) < 2 ? '#34d399' : '#f97316' }}>
                    Error vs prediction: {durationErr}h
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-mid)' }}>
                  Officers Actually Used
                </label>
                <input type="number" min="0" required className="input"
                  value={form.officers_used}
                  onChange={e => set('officers_used', e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-[13px] font-light" style={{ color: 'var(--text-mid)' }}>
              <input type="checkbox" checked={form.diversion_used}
                onChange={e => set('diversion_used', e.target.checked)}
                className="w-3.5 h-3.5 accent-amber-500" />
              Diversion was used
            </label>

            <div>
              <label className="block text-[11px] font-medium mb-2" style={{ color: 'var(--text-mid)' }}>
                Prediction Accuracy Rating
              </label>
              <AccuracyStars value={form.accuracy_rating} onChange={v => set('accuracy_rating', v)} />
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-mid)' }}>
                Notes (optional)
              </label>
              <textarea className="input h-16" placeholder="Anything worth capturing for future predictions…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Saving…' : '✓  Submit Debrief'}
            </button>

            {submitResult && (
              <div className="rounded-md p-3 text-center"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-sm font-medium text-emerald-400">Debrief saved</p>
                <p className="text-xs font-light mt-0.5 text-emerald-600">Click Retrain below to improve the model</p>
              </div>
            )}
            {error && (
              <div className="rounded-md p-3 text-xs"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Retrain section */}
      <div
        className="mt-5 rounded-lg p-5 shadow-card"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>
            Retrain on Accumulated Debriefs
          </h3>
          <span className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>LEARN loop</span>
        </div>
        <p className="text-[12px] font-light mb-4 leading-relaxed" style={{ color: 'var(--text-mid)' }}>
          Appends all debrief outcomes to the duration model training set and retrains in-place.
          The before/after MAE shows real improvement.
        </p>

        <button
          onClick={retrain}
          disabled={retraining}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-sm text-white rounded-lg transition-all"
          style={{ background: '#ea580c' }}
          onMouseEnter={e => !retraining && (e.currentTarget.style.background = '#c2410c')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ea580c')}
        >
          {retraining
            ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg> Retraining…</>
            : '🧠  Retrain Model'}
        </button>

        {retrainResult && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <ImprovementBadge before={retrainResult.before_mae_hours} after={retrainResult.after_mae_hours} />
              <span className="text-[11px] font-light" style={{ color: 'var(--text-lo)' }}>
                {retrainResult.n_debriefs_used} debriefs used ·
                {' '}{retrainResult.retrained_at?.slice(0, 19).replace('T', ' ')} UTC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md p-3 text-center"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                <div className="text-xl font-bold text-red-400">{retrainResult.before_mae_hours.toFixed(2)}h</div>
                <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>Before MAE</div>
              </div>
              <div className="rounded-md p-3 text-center"
                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-xl font-bold text-emerald-400">{retrainResult.after_mae_hours.toFixed(2)}h</div>
                <div className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-lo)' }}>After MAE</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={[
                  { label: 'Before', mae: retrainResult.before_mae_hours },
                  { label: 'After',  mae: retrainResult.after_mae_hours },
                ]}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="label" tick={{ fill: 'var(--text-lo)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-lo)', fontSize: 11 }} unit="h" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6 }}
                  formatter={v => [`${v.toFixed(3)}h`, 'MAE']}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="mae" radius={[4, 4, 0, 0]} maxBarSize={80}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <p className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-lo)' }}>
              MAE = Mean Absolute Error on the held-out temporal test set (Mar–Apr 2024).
              Lower is better. Each debrief gives the model a real outcome to learn from.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
