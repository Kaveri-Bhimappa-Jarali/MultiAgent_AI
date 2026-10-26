export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface SecurityEvent {
  id: number;
  event_id: string;
  timestamp: string;
  event_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source_ip?: string;
  destination_ip?: string;
  source_port?: number;
  destination_port?: number;
  protocol?: string;
  username?: string;
  host?: string;
  process_name?: string;
  process_path?: string;
  command_line?: string;
  file_path?: string;
  file_action?: string;
  detection_status: string;
  is_simulated: boolean;
  raw_payload?: string;
  created_at: string;
}

export interface DetectionRule {
  id: number;
  rule_id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  conditions: Record<string, any>;
  threshold: number;
  time_window_seconds: number;
  mitre_technique?: string;
  enabled: boolean;
  created_at: string;
}

export interface DetectionFinding {
  id: number;
  finding_id: string;
  rule_id?: string;
  rule_name: string;
  detection_method: string;
  severity: string;
  confidence: number;
  explanation: string;
  evidence: any;
  next_step?: string;
  timestamp: string;
}

export interface AgentStatus {
  name: string;
  role_description: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  last_run_time?: string;
  total_findings: number;
  health: string;
}

export interface AgentExecution {
  id: number;
  run_id: string;
  agent_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration_ms: number;
  input_summary?: string;
  findings_count: number;
  execution_log: Array<{ timestamp: string; level: string; message: string }>;
  error_message?: string;
}

export interface AgentFinding {
  id: number;
  finding_id: string;
  run_id: string;
  agent_name: string;
  title: string;
  severity: string;
  confidence: number;
  description: string;
  evidence: Record<string, any>;
  recommendations: string[];
  created_at: string;
}

export interface AttackPathGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'source_ip' | 'account' | 'endpoint' | 'server' | 'resource';
    status: 'attacker' | 'compromised' | 'affected' | 'target' | 'safe';
    details: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    relation: string;
    stage: string;
    confidence: number;
    status: 'confirmed' | 'inferred';
  }>;
  summary_path: string;
}

export interface AISummary {
  what_happened: string;
  how_did_it_begin: string;
  affected_systems_and_accounts: string;
  activities_occurred: string;
  likely_attack_sequence: string;
  evidence_supporting: string[];
  uncertainties: string[];
  next_steps: string[];
  timeline_highlights?: string[];
  generated_at?: string;
}

export interface Incident {
  id: number;
  incident_id: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  confidence: number;
  status: 'NEW' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'FALSE_POSITIVE';
  first_seen: string;
  last_seen: string;
  affected_users: string[];
  affected_hosts: string[];
  affected_ips: string[];
  event_count: number;
  assigned_analyst: string;
  investigation_status: string;
  response_status: string;
  ai_summary?: AISummary;
  attack_path_json?: AttackPathGraph;
  is_simulated: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentDetail extends Incident {
  events: SecurityEvent[];
  notes: Array<{ id: number; incident_id: string; author: string; note: string; created_at: string }>;
  risk_assessment?: {
    overall_score: number;
    severity_band: string;
    progression_stage: string;
    criticality_multiplier: number;
    factors: Record<string, any>;
    explanation: string;
    assessed_at: string;
  };
  response_actions: ResponseAction[];
  verification_results: VerificationResult[];
  audits: Array<{ actor: string; action: string; previous_state?: string; new_state?: string; timestamp: string }>;
  agent_findings: Array<{
    finding_id: string;
    agent_name: string;
    title: string;
    severity: string;
    confidence: number;
    description: string;
    evidence: any;
    recommendations: string[];
    created_at: string;
  }>;
}

export interface ResponseAction {
  id: number;
  action_id: string;
  incident_id: string;
  action_type: 'BLOCK_IP' | 'DISABLE_USER' | 'ISOLATE_ENDPOINT' | 'NOTIFY_ANALYST' | 'RESET_CREDENTIALS';
  target_type: string;
  target_value: string;
  reason: string;
  expected_effect: string;
  status: 'RECOMMENDED' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED';
  is_dry_run: boolean;
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  execution_result?: Record<string, any>;
  executed_at?: string;
}

export interface VerificationResult {
  id: number;
  verification_id: string;
  action_id: string;
  incident_id: string;
  verification_status: 'PENDING_VERIFICATION' | 'VERIFICATION_IN_PROGRESS' | 'VERIFIED_CONTAINED' | 'VERIFICATION_FAILED' | 'INCONCLUSIVE';
  checks_performed: Array<{ check: string; passed: boolean; parameter?: string }>;
  observed_events_count: number;
  evidence_summary: string;
  verified_at: string;
}

export interface ThreatIndicator {
  id: number;
  indicator_type: string;
  indicator_value: string;
  threat_name: string;
  threat_actor: string;
  confidence: number;
  severity: string;
  tags: string[];
  description?: string;
  first_seen: string;
  last_seen: string;
}

export interface ThreatLookupResult {
  indicator: string;
  found: boolean;
  source: string;
  threat_details?: ThreatIndicator;
  reputation_score: number;
  risk_level: string;
  recommendations: string[];
}

export interface EvaluationRun {
  id: number;
  run_id: string;
  dataset_name: string;
  model_type: string;
  sample_size: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  confusion_matrix: number[][];
  feature_importance: Record<string, number>;
  metrics_summary: Record<string, any>;
  evaluated_at: string;
}

export interface DashboardData {
  metrics: {
    total_events: number;
    events_in_timerange: number;
    open_incidents: number;
    critical_high_incidents: number;
    active_agents: number;
    idle_agents: number;
    error_agents: number;
    incidents_awaiting_investigation: number;
    actions_pending_approval: number;
    contained_threats: number;
    verification_failures: number;
  };
  event_trends: Array<{ timestamp: string; events_count: number; alerts_count: number }>;
  severity_distribution: Array<{ severity: string; count: number }>;
  category_distribution: Array<{ category: string; count: number }>;
  agent_health: Array<{ name: string; status: string; health: string; last_run?: string; findings_count: number }>;
  recent_critical_incidents: Array<any>;
  recent_events: Array<any>;
  system_status: Record<string, string>;
}
