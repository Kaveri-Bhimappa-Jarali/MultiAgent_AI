import {
  User,
  SecurityEvent,
  DetectionRule,
  DetectionFinding,
  AgentStatus,
  AgentExecution,
  AgentFinding,
  Incident,
  IncidentDetail,
  ResponseAction,
  VerificationResult,
  ThreatIndicator,
  ThreatLookupResult,
  EvaluationRun,
  DashboardData
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('soc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let errMessage = 'Request failed';
    try {
      const errData = await response.json();
      errMessage = errData.detail || errData.message || response.statusText;
    } catch {
      errMessage = response.statusText;
    }
    throw new Error(errMessage);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => request<User>('/auth/me'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboardSummary: () => request<DashboardData>('/dashboard/summary'),

  // Events
  getEvents: (params: { severity?: string; event_type?: string; search?: string; is_simulated?: boolean; limit?: number; offset?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.severity) query.append('severity', params.severity);
    if (params.event_type) query.append('event_type', params.event_type);
    if (params.search) query.append('search', params.search);
    if (params.is_simulated !== undefined) query.append('is_simulated', String(params.is_simulated));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));
    return request<{ total: number; limit: number; offset: number; events: SecurityEvent[] }>(`/events?${query.toString()}`);
  },
  getEvent: (eventId: string) => request<SecurityEvent>(`/events/${eventId}`),
  ingestEvent: (event: Partial<SecurityEvent>) =>
    request<any>('/events/ingest', { method: 'POST', body: JSON.stringify(event) }),
  importBatch: (events: Partial<SecurityEvent>[]) =>
    request<any>('/events/import', { method: 'POST', body: JSON.stringify({ events }) }),

  // Detections
  getFindings: (severity?: string) =>
    request<DetectionFinding[]>(`/detections${severity ? `?severity=${severity}` : ''}`),
  getRules: () => request<DetectionRule[]>('/detections/rules'),
  updateRule: (ruleId: string, updates: Partial<DetectionRule>) =>
    request<DetectionRule>(`/detections/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(updates) }),
  triggerEvaluation: () => request<any>('/detections/evaluate', { method: 'POST' }),

  // Agents
  getAgentsStatus: () => request<AgentStatus[]>('/agents/status'),
  getAgentRuns: (limit = 30) => request<AgentExecution[]>(`/agents/runs?limit=${limit}`),
  getAgentFindings: (limit = 50) => request<AgentFinding[]>(`/agents/findings?limit=${limit}`),
  runAgentPipeline: (params: { agent_name?: string; incident_id?: string } = {}) =>
    request<any>('/agents/run', { method: 'POST', body: JSON.stringify(params) }),

  // Incidents
  getIncidents: (params: { severity?: string; status?: string; is_simulated?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.severity) query.append('severity', params.severity);
    if (params.status) query.append('status', params.status);
    if (params.is_simulated !== undefined) query.append('is_simulated', String(params.is_simulated));
    return request<Incident[]>(`/incidents?${query.toString()}`);
  },
  getIncidentDetail: (incidentId: string) => request<IncidentDetail>(`/incidents/${incidentId}`),
  triggerIncidentInvestigation: (incidentId: string) =>
    request<any>(`/incidents/${incidentId}/investigate`, { method: 'POST' }),
  updateIncidentStatus: (incidentId: string, data: { status?: string; assigned_analyst?: string; note?: string }) =>
    request<any>(`/incidents/${incidentId}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  addIncidentNote: (incidentId: string, note: string) =>
    request<any>(`/incidents/${incidentId}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  // Responses & SOAR
  getResponses: (status?: string) =>
    request<ResponseAction[]>(`/responses${status ? `?status=${status}` : ''}`),
  approveResponse: (actionId: string, approver = 'Lead SOC Analyst') =>
    request<ResponseAction>(`/responses/${actionId}/approve`, { method: 'POST', body: JSON.stringify({ approver }) }),
  executeResponse: (actionId: string, dryRun = true) =>
    request<ResponseAction>(`/responses/${actionId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ actor: 'SOC Operator', dry_run: dryRun })
    }),
  verifyResponse: (actionId: string) =>
    request<VerificationResult>(`/responses/${actionId}/verify`, { method: 'POST' }),
  getVerifications: () => request<VerificationResult[]>('/responses/verifications'),

  // Intelligence
  lookupThreat: (indicator: string) =>
    request<ThreatLookupResult>('/intelligence/lookup', { method: 'POST', body: JSON.stringify({ indicator }) }),
  getIndicators: () => request<ThreatIndicator[]>('/intelligence/indicators'),

  // Historical Evaluation
  getEvaluationRuns: () => request<EvaluationRun[]>('/evaluation/runs'),
  runEvaluation: (dataset_name: string, model_type = 'Random Forest') =>
    request<EvaluationRun>('/evaluation/evaluate', {
      method: 'POST',
      body: JSON.stringify({ dataset_name, model_type, test_size: 0.25 })
    }),

  // Demo Lab
  triggerScenario: (scenarioNum: number) => request<any>(`/demo/scenario/${scenarioNum}`, { method: 'POST' }),
  resetDemoLab: () => request<any>('/demo/reset', { method: 'POST' }),

  // Settings
  getPolicies: () => request<Record<string, any>>('/settings/policies'),
  updatePolicies: (policies: Record<string, any>) =>
    request<any>('/settings/policies', { method: 'PUT', body: JSON.stringify(policies) }),
  getAuditLogs: (limit = 50) => request<any[]>(`/settings/audit-logs?limit=${limit}`),

  // Monitoring & Collectors Health
  getCollectorsHealth: () => request<any>('/health/collectors'),
  toggleCollector: (collectorId: string) =>
    request<any>(`/health/collectors/${collectorId}/toggle`, { method: 'POST' }),
  getPipelineHealth: () => request<any>('/health/pipeline'),
  controlDemoStream: (payload: { action: string; scenario?: string; rate?: number }) =>
    request<any>('/health/demo-stream/control', { method: 'POST', body: JSON.stringify(payload) }),

  // Virtual Enterprise Lab
  getVMNodes: () => request<any>('/vm/nodes'),
  getVMDiagnostics: () => request<any>('/vm/diagnostics'),
  runVMScenario: (payload: { scenario: string; target_ip?: string }) =>
    request<any>('/vm/simulation/run', { method: 'POST', body: JSON.stringify(payload) }),
  createVMAction: (payload: any) =>
    request<any>('/vm/actions/create', { method: 'POST', body: JSON.stringify(payload) })
};
