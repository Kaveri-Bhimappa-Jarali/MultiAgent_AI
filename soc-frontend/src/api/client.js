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
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Dashboard & KPIs
  getDashboardSummary: () => request('/dashboard/summary'),

  // Events & Ingest
  getEvents: (params = {}) => {
    const q = new URLSearchParams()
    if (params.limit) q.append('limit', params.limit)
    if (params.offset) q.append('offset', params.offset)
    if (params.severity) q.append('severity', params.severity)
    if (params.event_type) q.append('event_type', params.event_type)
    if (params.search) q.append('search', params.search)
    if (params.is_simulated !== undefined) q.append('is_simulated', String(params.is_simulated))
    return request(`/events?${q.toString()}`)
  },
  getEvent: (id) => request(`/events/${id}`),
  ingestEvent: (event) =>
    request('/events/ingest', { method: 'POST', body: JSON.stringify(event) }),
  importBatch: (events) =>
    request('/events/import', { method: 'POST', body: JSON.stringify({ events }) }),

  // Detections & Rules
  getFindings: (severity) =>
    request(`/detections${severity ? `?severity=${severity}` : ''}`),
  getRules: () => request('/detections/rules'),
  updateRule: (ruleId, updates) =>
    request(`/detections/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(updates) }),
  triggerEvaluation: () => request('/detections/evaluate', { method: 'POST' }),

  // Multi-Agent SOC
  getAgentsStatus: () => request('/agents/status'),
  getAgentRuns: (limit = 50) => request(`/agents/runs?limit=${limit}`),
  getAgentFindings: (limit = 80) => request(`/agents/findings?limit=${limit}`),
  runAgentPipeline: (params = {}) =>
    request('/agents/run', { method: 'POST', body: JSON.stringify(params) }),

  // Correlation & Incidents
  getIncidents: (params = {}) => {
    const q = new URLSearchParams()
    if (params.severity) q.append('severity', params.severity)
    if (params.status) q.append('status', params.status)
    if (params.is_simulated !== undefined) q.append('is_simulated', String(params.is_simulated))
    return request(`/incidents?${q.toString()}`)
  },
  getIncidentDetail: (incidentId) => request(`/incidents/${incidentId}`),
  investigateIncident: (incidentId) => request(`/incidents/${incidentId}/investigate`, { method: 'POST' }),
  triggerIncidentInvestigation: (incidentId) =>
    request(`/incidents/${incidentId}/investigate`, { method: 'POST' }),
  updateIncidentStatus: (incidentId, data) =>
    request(`/incidents/${incidentId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  addIncidentNote: (incidentId, note) =>
    request(`/incidents/${incidentId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  // Response Engine / SOAR
  getResponses: (status) => request(`/responses${status ? `?status=${status}` : ''}`),
  approveResponse: (actionId) => request(`/responses/${actionId}/approve`, { method: 'POST' }),
  allowResponse: (actionId) => request(`/responses/${actionId}/allow`, { method: 'POST' }),
  denyResponse: (actionId, reason = 'Analyst rejected action') =>
    request(`/responses/${actionId}/deny`, { method: 'POST', body: JSON.stringify({ reason }) }),
  simulateResponse: (actionId) => request(`/responses/${actionId}/simulate`, { method: 'POST' }),
  executeResponse: (actionId, dryRun = false) =>
    request(`/responses/${actionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun })
    }),
  verifyResponse: (actionId) => request(`/responses/${actionId}/verify`, { method: 'POST' }),
  getVerifications: () => request('/responses/verifications'),

  // Threat Intelligence (CTI)
  lookupThreat: (indicator) =>
    request('/intelligence/lookup', { method: 'POST', body: JSON.stringify({ indicator }) }),
  getIndicators: () => request('/intelligence/indicators'),

  // Historical & ML Evaluation
  getEvaluationRuns: () => request('/evaluation/runs'),
  runEvaluation: (dataset_name, model_type = 'Random Forest') =>
    request('/evaluation/evaluate', {
      method: 'POST',
      body: JSON.stringify({ dataset_name, model_type, test_size: 0.25 })
    }),

  // Demo Lab triggers
  triggerScenario: (scenarioNum) => request(`/demo/scenario/${scenarioNum}`, { method: 'POST' }),
  resetDemoLab: () => request('/demo/reset', { method: 'POST' }),

  // Settings & Policies
  getPolicies: () => request('/settings/policies'),
  updatePolicies: (policies) =>
    request('/settings/policies', { method: 'PUT', body: JSON.stringify(policies) }),
  getAuditLogs: (limit = 50) => request(`/settings/audit-logs?limit=${limit}`),

  // Monitoring & Pipeline Health
  getCollectorsHealth: () => request('/health/collectors'),
  toggleCollector: (collectorId) =>
    request(`/health/collectors/${collectorId}/toggle`, { method: 'POST' }),
  getPipelineHealth: () => request('/health/pipeline'),
  controlDemoStream: (payload) =>
    request('/health/demo-stream/control', { method: 'POST', body: JSON.stringify(payload) }),

  // Virtual Enterprise Lab
  getVMNodes: () => request('/vm/nodes'),
  getVMDiagnostics: () => request('/vm/diagnostics'),
  runVMScenario: (payload) =>
    request('/vm/simulation/run', { method: 'POST', body: JSON.stringify(payload) }),
  createVMAction: (payload) =>
    request('/vm/actions/create', { method: 'POST', body: JSON.stringify(payload) }),

  // Attack Simulation Console
  getSimulationStatus: () => request('/simulation/status'),
  getSimulationScenarios: () => request('/simulation/scenarios'),
  launchSimulation: (payload) =>
    request('/simulation/launch', { method: 'POST', body: JSON.stringify(payload) }),
  stopSimulation: (executionId, reason = 'User stop') =>
    request(`/simulation/${executionId}/stop`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getSimulationExecutions: (limit = 50) => request(`/simulation/executions?limit=${limit}`),
  getSimulationExecution: (executionId) => request(`/simulation/executions/${executionId}`),

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
