import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'

const DEFAULT_FORM = { actual_duration_hours: '', officers_used: '', diversion_used: false, accuracy_rating: 3, notes: '' }

export default function PostEventDebrief() {
  const [pending, setPending] = useState([])
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [submitResult, setSubmitResult] = useState(null)
  const [retrainResult, setRetrainResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.pendingDebriefs().then(d => { setPending(d.events); if (d.events.length) setSelected(d.events[0].event_id) }).catch(() => {})
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submitDebrief(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
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
      // Refresh pending list
      api.pendingDebriefs().then(d => setPending(d.events)).catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function retrain() {
    setRetraining(true)
    setError(null)
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <span className="text-xs text-amber-500 uppercase tracking-widest">LEARN</span>
      <h1 className="text-2xl font-bold text-slate-100 mb-1">Post-Event Debrief</h1>
      <p className="text-slate-400 text-sm mb-6">Record what actually happened. Each debrief improves future predictions.</p>

      {pending.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-500">
          No pending debriefs — run a triage first on the Event Triage page.
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Select triaged event</label>
            <select className="input w-full" value={selected} onChange={e => setSelected(e.target.value)}>
              {pending.map(e => (
                <option key={e.event_id} value={e.event_id}>
                  {e.event_id} — {e.event_cause} (EIS {e.eis.toFixed(1)}, predicted {e.predicted_duration_hours.toFixed(1)}h)
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="bg-slate-800 rounded-xl p-4 text-xs text-slate-400 grid grid-cols-3 gap-2">
              <div>Cause: <span className="text-slate-200">{selectedEvent.event_cause}</span></div>
              <div>Predicted: <span className="text-slate-200">{selectedEvent.predicted_duration_hours.toFixed(1)}h</span></div>
              <div>EIS: <span className="text-amber-400">{selectedEvent.eis.toFixed(1)}</span></div>
            </div>
          )}

          <form onSubmit={submitDebrief} className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Debrief</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400">Actual Duration (hours)</label>
                <input type="number" step="0.1" min="0" required className="input w-full" value={form.actual_duration_hours} onChange={e => set('actual_duration_hours', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Officers Actually Used</label>
                <input type="number" min="0" required className="input w-full" value={form.officers_used} onChange={e => set('officers_used', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={form.diversion_used} onChange={e => set('diversion_used', e.target.checked)} className="accent-amber-500" />
                Diversion was used
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Prediction accuracy</span>
                {[1,2,3,4,5].map(n => (
                  <button type="button" key={n} onClick={() => set('accuracy_rating', n)}
                    className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${form.accuracy_rating === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Notes (optional)</label>
              <textarea className="input w-full h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Saving…' : 'Submit Debrief'}
            </button>
            {submitResult && <p className="text-green-400 text-sm text-center">Debrief saved.</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </form>
        </div>
      )}

      {/* Retrain section */}
      <div className="mt-8 bg-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Retrain on Accumulated Debriefs</h3>
        <p className="text-xs text-slate-500 mb-4">Appends all debrief outcomes to the duration model training set and retrains. The before/after MAE chart shows real improvement.</p>
        <button onClick={retrain} disabled={retraining}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
          {retraining ? 'Retraining…' : 'Retrain Model'}
        </button>

        {retrainResult && (
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-2">
              Used {retrainResult.n_debriefs_used} debriefs · retrained at {retrainResult.retrained_at?.slice(0, 19)}
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={[
                { label: 'Before', mae: retrainResult.before_mae_hours },
                { label: 'After', mae: retrainResult.after_mae_hours },
              ]}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} unit="h" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                  formatter={v => [`${v.toFixed(2)}h`, 'MAE']}
                />
                <Bar dataKey="mae" radius={[4, 4, 0, 0]}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#22c55e" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
