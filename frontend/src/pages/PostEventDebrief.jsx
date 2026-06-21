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
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-full text-sm font-black transition-all duration-150 ${
            value >= n
              ? 'bg-amber-500 text-slate-900 shadow-md shadow-amber-500/30 scale-110'
              : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
          }`}
        >
          {n}
        </button>
      ))}
      <span className="text-xs text-slate-500 ml-2">
        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][value]}
      </span>
    </div>
  )
}

function ImprovementBadge({ before, after }) {
  const delta = before - after
  const pct = ((delta / before) * 100).toFixed(1)
  const improved = delta > 0
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
      improved
        ? 'bg-green-950/50 text-green-400 border-green-900'
        : 'bg-red-950/50 text-red-400 border-red-900'
    }`}>
      {improved ? '▼' : '▲'} {Math.abs(pct)}% {improved ? 'improvement' : 'regression'}
    </div>
  )
}

export default function PostEventDebrief() {
  const [pending, setPending]         = useState([])
  const [selected, setSelected]       = useState('')
  const [form, setForm]               = useState(DEFAULT_FORM)
  const [submitResult, setSubmitResult] = useState(null)
  const [retrainResult, setRetrainResult] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [retraining, setRetraining]   = useState(false)
  const [error, setError]             = useState(null)

  useEffect(() => {
    api.pendingDebriefs()
      .then(d => { setPending(d.events); if (d.events.length) setSelected(d.events[0].event_id) })
      .catch(() => {})
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submitDebrief(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSubmitResult(null)
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
      api.pendingDebriefs().then(d => { setPending(d.events); if (d.events.length) setSelected(d.events[0].event_id) }).catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function retrain() {
    setRetraining(true)
    setError(null)
    setRetrainResult(null)
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
  const predDuration  = selectedEvent ? selectedEvent.predicted_duration_hours : null
  const actDuration   = form.actual_duration_hours ? parseFloat(form.actual_duration_hours) : null
  const durationError = predDuration && actDuration ? Math.abs(actDuration - predDuration).toFixed(1) : null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <span className="section-eyebrow">LEARN</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Post-Event Debrief</h1>
        <p className="text-slate-400 text-sm mt-1">
          Record what actually happened. Each debrief improves future predictions — this is the LEARN loop.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border p-12 text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-5xl mb-4 opacity-40">📋</div>
          <p className="text-slate-400 font-medium">No pending debriefs</p>
          <p className="text-slate-600 text-sm mt-1">Run a triage on the Event Triage page first</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Event selector */}
          <div className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <label className="block text-[11px] font-medium text-slate-400">Select triaged event</label>
            <select className="input" value={selected} onChange={e => { setSelected(e.target.value); setSubmitResult(null) }}>
              {pending.map(e => (
                <option key={e.event_id} value={e.event_id}>
                  {e.event_id} — {e.event_cause.replace(/_/g, ' ')} · EIS {e.eis.toFixed(1)} · predicted {e.predicted_duration_hours.toFixed(1)}h
                </option>
              ))}
            </select>
            {selectedEvent && (
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[
                  { label: 'Cause', value: selectedEvent.event_cause.replace(/_/g, ' '), color: '#94a3b8' },
                  { label: 'Predicted duration', value: `${selectedEvent.predicted_duration_hours.toFixed(1)}h`, color: '#f59e0b' },
                  { label: 'EIS score', value: selectedEvent.eis.toFixed(1), color: selectedEvent.eis >= 80 ? '#ef4444' : selectedEvent.eis >= 50 ? '#f97316' : '#eab308' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-slate-800/60 p-2.5 text-center">
                    <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debrief form */}
          <form onSubmit={submitDebrief} className="rounded-xl border p-5 space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold text-slate-200">Debrief Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Actual Duration (hours)</label>
                <input type="number" step="0.1" min="0" required className="input"
                  value={form.actual_duration_hours}
                  onChange={e => set('actual_duration_hours', e.target.value)} />
                {durationError && predDuration && (
                  <p className="text-[10px] mt-1 text-slate-500">
                    Error vs prediction: <span className={parseFloat(durationError) < 2 ? 'text-green-400' : 'text-orange-400'}>{durationError}h</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Officers Actually Used</label>
                <input type="number" min="0" required className="input"
                  value={form.officers_used}
                  onChange={e => set('officers_used', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300">
                <input type="checkbox" checked={form.diversion_used}
                  onChange={e => set('diversion_used', e.target.checked)}
                  className="w-4 h-4 accent-amber-500" />
                Diversion was used
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-2">Prediction Accuracy Rating</label>
              <AccuracyStars value={form.accuracy_rating} onChange={v => set('accuracy_rating', v)} />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Notes (optional)</label>
              <textarea className="input h-16 resize-none" placeholder="Anything worth capturing for future predictions…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm
                rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
              {loading ? '⟳ Saving…' : '✓ Submit Debrief'}
            </button>

            {submitResult && (
              <div className="rounded-lg bg-green-950/40 border border-green-900 p-3 text-center">
                <p className="text-green-400 text-sm font-semibold">✓ Debrief saved successfully</p>
                <p className="text-green-600 text-xs mt-0.5">Click "Retrain" below to improve the model</p>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-800 p-3 text-xs text-red-400">
                {error}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── Retrain section ── */}
      <div className="mt-6 rounded-xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Retrain on Accumulated Debriefs</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Appends all debrief outcomes to the duration model training set and retrains in-place.
              The before/after MAE shows real improvement.
            </p>
          </div>
          <span className="text-xs text-slate-600 border border-slate-700 rounded-full px-2 py-0.5">
            LEARN loop
          </span>
        </div>

        <button onClick={retrain} disabled={retraining}
          className="mt-3 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-sm
            rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
          {retraining
            ? <span className="flex items-center gap-2"><span className="animate-spin inline-block">⟳</span> Retraining…</span>
            : '🧠 Retrain Model'}
        </button>

        {retrainResult && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <ImprovementBadge before={retrainResult.before_mae_hours} after={retrainResult.after_mae_hours} />
              <span className="text-xs text-slate-500">
                {retrainResult.n_debriefs_used} debriefs used ·
                retrained {retrainResult.retrained_at?.slice(0, 19).replace('T', ' ')} UTC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800/60 p-3 text-center border border-slate-700">
                <div className="text-2xl font-black text-red-400">{retrainResult.before_mae_hours.toFixed(2)}h</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Before MAE</div>
              </div>
              <div className="rounded-lg bg-green-950/40 p-3 text-center border border-green-900/50">
                <div className="text-2xl font-black text-green-400">{retrainResult.after_mae_hours.toFixed(2)}h</div>
                <div className="text-[10px] text-slate-500 mt-0.5">After MAE</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={[
                { label: 'Before', mae: retrainResult.before_mae_hours },
                { label: 'After',  mae: retrainResult.after_mae_hours },
              ]} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="h" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={v => [`${v.toFixed(3)}h`, 'MAE']}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar dataKey="mae" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#22c55e" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              MAE = Mean Absolute Error on the held-out temporal test set (Mar–Apr 2024).
              Lower is better. Each debrief gives the model a real outcome to learn from.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
