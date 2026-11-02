// API Client communicating with FastAPI backend
const API_BASE = '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('soc_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {})
      }
    })

    // If unauthorized, auto-authenticate with default credentials and retry once
    if (res.status === 401 && !options._retried) {
      await api.autoLogin()
      return request(endpoint, { ...options, _retried: true })
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || err.message || res.statusText)
    }

    return await res.json()
  } catch (err) {
    console.warn(`[SOC API] Error on ${endpoint}:`, err.message)
    throw err
  }
}

export const api = {
  // Authentication
  autoLogin: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'analyst',
          password: 'Analyst@SOC2026!'
        })
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('soc_token', data.access_token)
        localStorage.setItem('soc_user', JSON.stringify(data.user))
        return data
      }
    } catch (e) {
      console.warn('Auto-login failed:', e)
    }
  },

  // Dashboard & KPIs
  getDashboardSummary: () => request('/dashboard/summary'),

  // Events & Ingest
  getEvents: (params = {}) => {
    const q = new URLSearchParams()
    if (params.limit) q.append('limit', params.limit)
    if (params.offset) q.append('offset', params.offset)
    if (params.severity) q.append('severity', params.severity)
    if (params.search) q.append('search', params.search)
    return request(`/events?${q.toString()}`)
  },
  getEvent: (id) => request(`/events/${id}`),

  // Correlation & Incidents
  getIncidents: (params = {}) => {
    const q = new URLSearchParams()
    if (params.severity) q.append('severity', params.severity)
    if (params.status) q.append('status', params.status)
    return request(`/incidents?${q.toString()}`)
  },
  getIncidentDetail: (incidentId) => request(`/incidents/${incidentId}`),
  investigateIncident: (incidentId) => request(`/incidents/${incidentId}/investigate`, { method: 'POST' }),

  // Response Engine / SOAR
  getResponses: (status) => request(`/responses${status ? `?status=${status}` : ''}`),
  approveResponse: (actionId) => request(`/responses/${actionId}/approve`, { method: 'POST' }),
  executeResponse: (actionId, dryRun = false) =>
    request(`/responses/${actionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun })
    }),

  // Demo Lab triggers
  triggerScenario: (scenarioNum) => request(`/demo/scenario/${scenarioNum}`, { method: 'POST' }),

  // WebSocket Live Broadcaster
  connectWebSocket: (onMessage, onOpen, onClose) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws`
    let ws = null

    try {
      ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        if (onOpen) onOpen()
      }
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (onMessage) onMessage(parsed)
        } catch (e) {
          if (onMessage) onMessage(event.data)
        }
      }
      ws.onclose = () => {
        if (onClose) onClose()
      }
      ws.onerror = (err) => {
        console.warn('[SOC WS] Connection notice:', err)
      }
    } catch (e) {
      console.warn('[SOC WS] Failed to create WebSocket:', e)
    }

    return ws
  }
}
