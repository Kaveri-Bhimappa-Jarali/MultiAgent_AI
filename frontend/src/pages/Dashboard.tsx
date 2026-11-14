import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardData, AttentionItem, VerificationResult } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import {
  ShieldAlert,
  Radio,
  Bot,
  Zap,
  CheckCircle2,
  AlertOctagon,
  Activity,
  ArrowRight,
  RefreshCw,
  Play,
  Layers,
  Server,
  Database,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileCheck,
  ChevronRight,
  Shield,
  Workflow,
  CheckCircle
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { formatSocTimestamp } from '../utils/timestamps.js';

// Helper to categorize raw security events into 4 clean labels
function getFriendlyEventCategory(evt: any): { label: string; tag: string; badgeClass: string } {
  const type = (evt.event_type || '').toLowerCase();
  const fileAction = (evt.file_action || '').toLowerCase();
  const processName = (evt.process_name || '').toLowerCase();

  if (type.includes('auth') || type.includes('login') || type.includes('brute') || type.includes('credential')) {
    return {
      label: 'Authentication Event',
      tag: 'Auth',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/25'
    };
  }
  if (type.includes('network') || type.includes('port') || type.includes('c2') || type.includes('scan') || type.includes('traffic')) {
    return {
      label: 'Network Anomaly',
      tag: 'Network',
      badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/25'
    };
  }
  if (type.includes('malware') || type.includes('ransom') || type.includes('trojan') || processName.includes('mimikatz') || fileAction.includes('encrypt')) {
    return {
      label: 'Malware / Exploit',
      tag: 'Malware',
      badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/25'
    };
  }
  return {
    label: 'System / Process Event',
    tag: 'System',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/25'
  };
}

// Ingestion freshness calculator
function getIngestionFreshness(recentEvents?: any[]): { status: string; details: string; isLive: boolean } {
  if (!recentEvents || recentEvents.length === 0) {
    return { status: 'IDLE', details: 'Waiting for telemetry', isLive: false };
  }
  const latest = recentEvents[0];
  const eventTime = new Date(latest.timestamp).getTime();
  const diffMinutes = Math.round((Date.now() - eventTime) / (1000 * 60));

  if (isNaN(diffMinutes) || diffMinutes <= 5) {
    return { status: 'LIVE', details: 'Telemetry streaming actively', isLive: true };
  } else if (diffMinutes < 60) {
    return { status: 'IDLE', details: `Last log received ${diffMinutes}m ago`, isLive: false };
  } else {
    const diffHours = Math.round(diffMinutes / 60);
    return { status: 'IDLE', details: `Last log received ${diffHours}h ago`, isLive: false };
  }
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const [dashRes, verifRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getVerifications().catch(() => [] as VerificationResult[])
      ]);
      setData(dashRes);
      setVerifications(verifRes || []);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 20000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket real-time updates
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (newEvent: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedRecent = [newEvent, ...(prev.recent_events || []).slice(0, 7)];
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            total_events: prev.metrics.total_events + 1,
            events_in_timerange: prev.metrics.events_in_timerange + 1
          },
          recent_events: updatedRecent
        };
      });
      setLastUpdated(new Date().toISOString());
    });

    const unsub2 = subscribe('AGENT_STATUS_CHANGED', (agentUpdate: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedAgents = (prev.agent_health || []).map((ag) => {
          if (ag.name === agentUpdate.name) {
            return {
              ...ag,
              status: agentUpdate.status,
              last_run: new Date().toISOString(),
              findings_count: agentUpdate.findings_count !== undefined ? agentUpdate.findings_count : ag.findings_count
            };
          }
          return ag;
        });
        return { ...prev, agent_health: updatedAgents };
      });
      setLastUpdated(new Date().toISOString());
    });

    const unsub3 = subscribe('INCIDENT_UPDATED', (incUpdate: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const exists = (prev.recent_critical_incidents || []).some((i) => i.incident_id === incUpdate.incident_id);
        const updatedIncidents = exists
          ? (prev.recent_critical_incidents || []).map((i) => (i.incident_id === incUpdate.incident_id ? { ...i, ...incUpdate } : i))
          : [incUpdate, ...(prev.recent_critical_incidents || []).slice(0, 4)];
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            open_incidents: prev.metrics.open_incidents + (exists ? 0 : 1)
          },
          recent_critical_incidents: updatedIncidents
        };
      });
      setLastUpdated(new Date().toISOString());
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-royal animate-spin" />
          <p className="text-xs text-mutedslate font-mono uppercase tracking-wider">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_events: 0,
    events_in_timerange: 0,
    open_incidents: 0,
    critical_high_incidents: 0,
    active_agents: 10,
    idle_agents: 10,
    error_agents: 0,
    incidents_awaiting_investigation: 0,
    actions_pending_approval: 0,
    contained_threats: 0,
    verification_failures: 0
  };

  const attentionItems: AttentionItem[] = data?.attention_items || [];
  const systemHealth = data?.system_health_components || {
    backend_api: { name: 'Backend API', status: 'Online', details: 'FastAPI service active', is_simulated: false },
    database: { name: 'Database', status: 'Online', details: 'SQLite relational store connected', is_simulated: false },
    event_collection: { name: 'Event Collection', status: 'Online', details: 'Telemetry collectors active', is_simulated: false },
    event_processing: { name: 'Event Processing', status: 'Online', details: 'Worker queue operational', is_simulated: false },
    websocket: { name: 'WebSocket Connection', status: 'Online', details: 'Live streaming connected', is_simulated: false },
    virtual_nodes: { name: 'Virtual Nodes', status: 'Online', details: 'Simulated node daemons active', is_simulated: true }
  };

  const agentSummary = data?.agent_summary || {
    total: 10,
    available: 10,
    investigating: 0,
    error_count: 0
  };

  const verifiedCount = verifications.filter(
    (v) =>
      v.verification_status === 'VERIFIED' ||
      v.verification_status === 'VERIFIED_CONTAINED' ||
      v.verification_status === 'SIMULATED'
  ).length;

  const isSystemHealthy = Object.values(systemHealth).every((c) => c.status === 'Online');
  const hasActiveIncidents = metrics.open_incidents > 0 || metrics.critical_high_incidents > 0;
  const ingestionFreshness = getIngestionFreshness(data?.recent_events);

  return (
    <div className="space-y-6">
      {/* 1. TOP SECTION: CLEAN PAGE HEADER & SYSTEM STATUS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-navy-800 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-softwhite font-mono uppercase">
              Command Center
            </h1>
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${
                hasActiveIncidents
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : isSystemHealthy
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasActiveIncidents ? 'bg-rose-400 animate-pulse' : isSystemHealthy ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {hasActiveIncidents
                  ? `${metrics.open_incidents} ACTIVE INCIDENT${metrics.open_incidents > 1 ? 'S' : ''}`
                  : isSystemHealthy
                  ? 'MONITORING ACTIVE • NOMINAL'
                  : 'SYSTEM ATTENTION REQUIRED'}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <div className="flex items-center space-x-1">
              <span className="text-slate-500">Telemetry:</span>
              <span className={`font-semibold ${ingestionFreshness.isLive ? 'text-emerald-400' : 'text-slate-300'}`}>
                {ingestionFreshness.status}
              </span>
              <span className="text-slate-500">({ingestionFreshness.details})</span>
            </div>
            <span className="text-navy-700">•</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Synced: {formatSocTimestamp(lastUpdated)}</span>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => navigate('/demo')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-semibold font-mono"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Demo Attack</span>
          </button>

          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 text-slate-300 hover:text-softwhite text-xs font-mono transition"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-royal-300' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. SECURITY METRICS: 6 COMPACT, CONSISTENT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Metric 1 */}
        <div
          onClick={() => navigate('/events')}
          className="p-3.5 rounded-xl bg-navy-850 border border-navy-750 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Security Events</span>
            <Radio className="w-4 h-4 text-royal-300 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{metrics.total_events.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5">+{metrics.events_in_timerange} past 24h</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => navigate('/incidents')}
          className={`p-3.5 rounded-xl bg-navy-850 border transition cursor-pointer flex flex-col justify-between group ${
            metrics.open_incidents > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-navy-750 hover:border-royal/50'
          }`}
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Open Incidents</span>
            <ShieldAlert className={`w-4 h-4 group-hover:scale-110 transition-transform ${metrics.open_incidents > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{metrics.open_incidents}</p>
            <p className={`text-[11px] font-mono mt-0.5 ${metrics.critical_high_incidents > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {metrics.critical_high_incidents} Critical / High
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => navigate('/detections')}
          className={`p-3.5 rounded-xl bg-navy-850 border transition cursor-pointer flex flex-col justify-between group ${
            metrics.critical_high_incidents > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-navy-750 hover:border-royal/50'
          }`}
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Critical Alerts</span>
            <AlertTriangle className={`w-4 h-4 group-hover:scale-110 transition-transform ${metrics.critical_high_incidents > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{metrics.critical_high_incidents}</p>
            <p className="text-[11px] text-mutedslate font-mono mt-0.5">Detection Engine</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => navigate('/agents')}
          className="p-3.5 rounded-xl bg-navy-850 border border-navy-750 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">AI Agents Ready</span>
            <Bot className="w-4 h-4 text-royal-300 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{agentSummary.available} / {agentSummary.total}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
              {agentSummary.investigating > 0 ? `${agentSummary.investigating} investigating` : 'Standby fleet active'}
            </p>
          </div>
        </div>

        {/* Metric 5 */}
        <div
          onClick={() => navigate('/responses')}
          className={`p-3.5 rounded-xl bg-navy-850 border transition cursor-pointer flex flex-col justify-between group ${
            metrics.actions_pending_approval > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-navy-750 hover:border-royal/50'
          }`}
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <Zap className={`w-4 h-4 group-hover:scale-110 transition-transform ${metrics.actions_pending_approval > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{metrics.actions_pending_approval}</p>
            <p className="text-[11px] text-amber-300 font-mono mt-0.5">SOAR Review</p>
          </div>
        </div>

        {/* Metric 6 */}
        <div
          onClick={() => navigate('/responses')}
          className="p-3.5 rounded-xl bg-navy-850 border border-navy-750 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-mutedslate mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Verified Responses</span>
            <FileCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-softwhite">{verifiedCount}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
              {metrics.contained_threats} Contained
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN SECURITY WORKFLOW PIPELINE (Prominent Connected Visualization) */}
      <div className="p-5 rounded-2xl bg-navy-850 border border-navy-750 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
          <div>
            <h2 className="text-sm font-bold text-softwhite font-mono uppercase flex items-center space-x-2">
              <Workflow className="w-4 h-4 text-royal-300" />
              <span>End-to-End Security Operations Workflow</span>
            </h2>
            <p className="text-xs text-mutedslate mt-0.5">
              Live operational lifecycle from initial telemetry capture to automated defense and containment verification.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-navy-900 px-2.5 py-1 rounded-md border border-navy-800">
            Pipeline: Fully Integrated
          </span>
        </div>

        {/* Horizontal Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {/* Stage 1 */}
          <div
            onClick={() => navigate('/ingestion')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">01</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  ingestionFreshness.isLive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {ingestionFreshness.status}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Data Collection</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                {metrics.total_events.toLocaleString()} events
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 2 */}
          <div
            onClick={() => navigate('/detections')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">02</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  12 Rules
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Threat Detection</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                Rules &amp; ML Isolation
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 3 */}
          <div
            onClick={() => navigate('/agents')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">03</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-royal/15 text-royal-200 border border-royal/30">
                  10 Agents
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Multi-Agent AI</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                {agentSummary.investigating > 0 ? `${agentSummary.investigating} Active` : 'Autonomous fleet'}
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 4 */}
          <div
            onClick={() => navigate('/incidents')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">04</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Graph Correl
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Event Correlation</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                Cross-entity clusters
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 5 */}
          <div
            onClick={() => navigate('/incidents')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">05</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  metrics.open_incidents > 0 ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {metrics.open_incidents} Open
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Incident RCA</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                Root-cause triage
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 6 */}
          <div
            onClick={() => navigate('/responses')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">06</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                  metrics.actions_pending_approval > 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  SOAR Active
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">SOAR Response</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                {metrics.actions_pending_approval} Pending Review
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Stage 7 */}
          <div
            onClick={() => navigate('/responses')}
            className="p-3 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/60 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-gold font-bold">07</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {verifiedCount} Verified
                </span>
              </div>
              <h4 className="text-xs font-semibold text-softwhite group-hover:text-royal-300 transition">Verification</h4>
              <p className="text-[11px] text-mutedslate mt-1 font-mono">
                Audited containment
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-royal-300 font-mono">
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. IMPORTANT ATTENTION ITEMS (Unresolved criticals, approvals, failures) */}
      <div className="p-5 rounded-2xl bg-navy-850 border border-navy-750 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-800">
          <div>
            <h2 className="text-sm font-bold text-softwhite font-mono uppercase flex items-center space-x-2">
              <AlertOctagon className={`w-4 h-4 ${attentionItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>Actionable Attention Items</span>
              {attentionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {attentionItems.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-mutedslate mt-0.5">
              Unresolved priority findings, pending approvals, or infrastructure anomalies requiring analyst intervention.
            </p>
          </div>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-6 rounded-xl bg-navy-900 border border-emerald-500/20 flex items-center space-x-4">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-emerald-300 font-mono uppercase">All Clear — Zero Unresolved Alerts</h4>
              <p className="text-xs text-mutedslate mt-0.5">
                No open high-priority incidents, pending response approvals, or collector errors detected across the environment.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-navy-900 border border-navy-750 hover:border-royal/50 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <SeverityBadge severity={item.severity} size="sm" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-semibold text-softwhite">{item.title}</h4>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded bg-navy-800 text-slate-400 border border-navy-700">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-mutedslate mt-1">{item.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Logged: {formatSocTimestamp(item.timestamp)}</p>
                  </div>
                </div>

                <div className="flex-shrink-0 self-end md:self-center">
                  <button
                    onClick={() => navigate(item.action_url)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-royal/15 text-royal-200 border border-royal/40 hover:bg-royal/25 text-xs font-semibold font-mono transition"
                  >
                    <span>{item.action_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. TWO-COLUMN OPERATIONAL SECTION: RECENT ACTIVITY & SYSTEM INFRASTRUCTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Security Activity Table (2 columns wide) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-navy-850 border border-navy-750 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-softwhite font-mono uppercase flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-royal-300" />
                  <span>Recent Security Activity</span>
                </h3>
                <p className="text-xs text-mutedslate mt-0.5">
                  Latest raw telemetry events captured across endpoints and network sensors.
                </p>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
              >
                <span>View All Events</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {(!data?.recent_events || data.recent_events.length === 0) ? (
              <div className="p-8 text-center text-xs text-mutedslate font-mono bg-navy-900/60 rounded-xl my-4">
                No telemetry recorded in current time window. Execute a scenario in Demo Attack Lab.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-navy-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-2.5">Activity</th>
                      <th className="py-2.5 px-2.5">Timestamp (IST)</th>
                      <th className="py-2.5 px-2.5">Source / Entity</th>
                      <th className="py-2.5 px-2.5">Affected Target</th>
                      <th className="py-2.5 px-2.5">Severity</th>
                      <th className="py-2.5 px-2.5">Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/60 font-mono">
                    {data.recent_events.map((evt) => {
                      const friendly = getFriendlyEventCategory(evt);
                      return (
                        <tr
                          key={evt.event_id}
                          onClick={() => navigate('/events')}
                          className="hover:bg-navy-900/80 transition cursor-pointer"
                        >
                          <td className="py-2.5 px-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${friendly.badgeClass}`}>
                              {friendly.label}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              {evt.event_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-300 whitespace-nowrap text-[11px]">
                            {formatSocTimestamp(evt.timestamp)}
                          </td>
                          <td className="py-2.5 px-2.5 text-softwhite">
                            <span className="font-semibold block truncate max-w-[130px]">
                              {evt.source_ip || evt.username || 'System'}
                            </span>
                            {evt.username && evt.source_ip && (
                              <span className="text-[10px] text-slate-400 block truncate">User: {evt.username}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-softwhite">
                            <span className="block truncate max-w-[130px]">
                              {evt.host || evt.destination_ip || 'Internal Network'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <SeverityBadge severity={evt.severity} size="sm" />
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                                evt.is_simulated
                                  ? 'bg-purple-900/30 text-purple-300 border border-purple-700/40'
                                  : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40'
                              }`}
                            >
                              {evt.is_simulated ? 'Simulated Lab' : 'Live Sensor'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* System Health & Agent Fleet Summary (1 column wide) */}
        <div className="space-y-6">
          {/* Agent Fleet Status */}
          <div className="p-5 rounded-2xl bg-navy-850 border border-navy-750 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-softwhite font-mono uppercase flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-royal-300" />
                  <span>Agent Fleet</span>
                </h3>
                <p className="text-xs text-mutedslate mt-0.5">10 autonomous specialists</p>
              </div>
              <button
                onClick={() => navigate('/agents')}
                className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
              >
                <span>All Agents</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {(data?.agent_health || []).map((ag) => (
                <div
                  key={ag.name}
                  onClick={() => navigate('/agents')}
                  className="p-2 rounded-lg bg-navy-900 border border-navy-800 hover:border-royal/50 transition cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate text-softwhite text-[11px]" title={ag.name}>
                    {ag.name.replace(' Agent', '')}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ml-1.5 ${
                      ag.status === 'RUNNING'
                        ? 'bg-royal animate-ping'
                        : ag.status === 'FAILED'
                        ? 'bg-rose-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="p-5 rounded-2xl bg-navy-850 border border-navy-750 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-softwhite font-mono uppercase flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Infrastructure</span>
                </h3>
                <p className="text-xs text-mutedslate mt-0.5">Core service connectivity</p>
              </div>
              <button
                onClick={() => navigate('/health-monitor')}
                className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
              >
                <span>Monitor</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(systemHealth).map(([key, comp]) => {
                const isOnline = comp.status === 'Online';
                return (
                  <div
                    key={key}
                    className="p-2 rounded-lg bg-navy-900 border border-navy-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-softwhite text-xs font-semibold">{comp.name}</span>
                      {comp.is_simulated && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-900/40 text-purple-300 border border-purple-700/30">
                          Simulated
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {comp.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
