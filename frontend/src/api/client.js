const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  health: () => apiFetch('/api/health'),
  activeEvents: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)))
    return apiFetch(`/api/events/active${q.toString() ? '?' + q : ''}`)
  },
  heatmap: () => apiFetch('/api/events/heatmap'),
  triage: (body) => apiFetch('/api/events/triage', { method: 'POST', body: JSON.stringify(body) }),
  stations: () => apiFetch('/api/allocator/stations'),
  allocate: (body) => apiFetch('/api/allocator/run', { method: 'POST', body: JSON.stringify(body) }),
  pendingDebriefs: () => apiFetch('/api/debrief/pending'),
  submitDebrief: (body) => apiFetch('/api/debrief', { method: 'POST', body: JSON.stringify(body) }),
  retrain: () => apiFetch('/api/learn/retrain', { method: 'POST' }),
  insights: () => apiFetch('/api/insights/summary'),
}
