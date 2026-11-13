import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardData, AttentionItem, SystemHealthComponent } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
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
  HelpCircle,
  X,
  Server,
  Cpu,
  Layers,
  Wifi,
  Database,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { formatSocTimestamp } from '../utils/timestamps.js';
import { SecurityWorkflow } from '../components/dashboard/SecurityWorkflow';
import { RiskGauge } from '../components/dashboard/RiskGauge';
import { ActivityChart } from '../components/dashboard/ActivityChart';

// Technical terms glossary entries
const GLOSSARY_TERMS = [
  {
    term: 'Security Event',
    tag: 'Data Signal',
    definition: 'A single record or log message describing an activity on a computer, server, or network—such as a user signing in, a file being modified, or a network connection being opened.'
  },
  {
    term: 'Detection',
    tag: 'Alert Flag',
    definition: 'A flag or alert generated when a security rule or Machine Learning model identifies an event that matches known attacker behavior or deviates from normal activity.'
  },
  {
    term: 'Incident',
    tag: 'Investigation',
    definition: 'A confirmed, higher-priority security issue created by correlating multiple related detections together to give analysts a complete picture of an attack.'
  },
  {
    term: 'Severity',
    tag: 'Impact Level',
    definition: 'A rating (Critical, High, Medium, Low, Info) describing how dangerous a threat is and how quickly an administrator must react.'
  },
  {
    term: 'Risk Score',
    tag: '0 - 100 Score',
    definition: 'A calculated numerical score from 0 to 100 indicating the total danger of an incident based on asset value, severity, exploitability, and confidence.'
  },
  {
    term: 'AI Agent',
    tag: 'Autonomous Helper',
    definition: 'A specialized autonomous software assistant programmed to investigate specific aspects of an attack—such as inspecting logs, mapping network hops, or verifying threat intelligence.'
  },
  {
    term: 'MITRE ATT&CK',
    tag: 'Threat Framework',
    definition: 'A globally recognized dictionary of adversary Tactics, Techniques, and Procedures (TTPs) documenting how real-world attackers infiltrate and move inside networks.'
  },
  {
    term: 'SOAR',
    tag: 'Automated Defense',
    definition: 'Security Orchestration, Automation, and Response—automated workflows that execute containment actions, such as isolating a compromised host or blocking a malicious IP address.'
  },
  {
    term: 'Response Verification',
    tag: 'Containment Check',
    definition: 'An automated post-execution audit that probes the system to verify whether a defensive action (like blocking an attacker) actually stopped the malicious behavior.'
  }
];

// Helper to categorize raw security events into 4 friendly beginner labels
function getFriendlyEventCategory(evt: any): { label: string; tag: string; badgeClass: string } {
  const type = (evt.event_type || '').toLowerCase();
  const fileAction = (evt.file_action || '').toLowerCase();
  const processName = (evt.process_name || '').toLowerCase();

  if (type.includes('auth') || type.includes('login') || type.includes('brute') || type.includes('credential')) {
    return {
      label: 'Failed login attempt',
      tag: 'Authentication',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    };
  }
  if (type.includes('network') || type.includes('port') || type.includes('c2') || type.includes('scan') || type.includes('traffic')) {
    return {
      label: 'Suspicious network activity',
      tag: 'Network Flow',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    };
  }
  if (type.includes('malware') || type.includes('ransom') || type.includes('trojan') || processName.includes('mimikatz') || fileAction.includes('encrypt')) {
    return {
      label: 'Malware-related activity',
      tag: 'Malware',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    };
  }
  return {
    label: 'Unusual system behaviour',
    tag: 'System / Process',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  };
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.getDashboardSummary();
      setData(res);
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
          <p className="text-sm text-mutedslate font-mono">Loading Security Overview...</p>
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
    virtual_nodes: { name: 'Virtual Nodes', status: 'Online', details: 'Simulated node daemons active (Hardware VMs blocked: 0.95 GB free RAM)', is_simulated: true }
  };

  const agentSummary = data?.agent_summary || {
    total: 10,
    available: 10,
    investigating: 0,
    error_count: 0
  };

  const isSystemWorking = Object.values(systemHealth).every((c) => c.status === 'Online');
  const hasSecurityProblems = metrics.open_incidents > 0 || metrics.critical_high_incidents > 0;

  const filteredGlossary = GLOSSARY_TERMS.filter(
    (item) =>
      item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      item.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. WELCOME SECTION */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-navy-700/80 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-royal to-transparent opacity-80" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-softwhite">Security Overview</h1>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  hasSecurityProblems
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : isSystemWorking
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasSecurityProblems ? 'bg-rose-400 animate-pulse' : isSystemWorking ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {hasSecurityProblems
                    ? `${metrics.open_incidents} Security Incident${metrics.open_incidents > 1 ? 's' : ''} Detected`
                    : isSystemWorking
                    ? 'Security System Operational • All Monitors Active'
                    : 'System Health Attention Required'}
                </span>
              </span>
            </div>
            <p className="text-sm text-mutedslate max-w-3xl">
              Monitor security activity, identify threats and manage incidents. This central dashboard summarizes all incoming signals,
              evaluates system health, and highlights actions requiring immediate attention.
            </p>
            <div className="flex items-center space-x-2 mt-3 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-royal-300" />
              <span>Last updated: {formatSocTimestamp(lastUpdated)}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowGlossary(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 hover:border-royal/60 text-softwhite text-xs font-medium transition"
              title="Learn Cybersecurity and SOC terms in plain language"
            >
              <HelpCircle className="w-4 h-4 text-royal-300" />
              <span>Beginner's Guide</span>
            </button>

            <button
              onClick={() => navigate('/demo')}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Demo Attack</span>
            </button>

            <button
              onClick={fetchDashboard}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs transition"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. END-TO-END SOC INTELLIGENCE PIPELINE */}
      <SecurityWorkflow />

      {/* 3. SUMMARY CARDS (5 Essential Metrics with Explanations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Events */}
        <div
          onClick={() => navigate('/events')}
          className="relative overflow-hidden p-5 rounded-2xl bg-navy-800 border border-navy-700/80 hover:border-royal/60 transition-all duration-200 shadow-lg hover:shadow-glow-royal cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-royal/80 to-transparent" />
          <div>
            <div className="flex items-center justify-between text-mutedslate mb-1">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider">Total Events</span>
              <div className="w-8 h-8 rounded-lg bg-royal/15 flex items-center justify-center text-royal-300">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-softwhite">{metrics.total_events.toLocaleString()}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5 font-medium">+{metrics.events_in_timerange} in past 24h</p>
          </div>
          <p className="text-[11px] text-mutedslate mt-3 border-t border-navy-700/60 pt-2 leading-relaxed">
            Raw telemetry logs captured from endpoints, servers, and network devices.
          </p>
        </div>

        {/* Card 2: Open Incidents */}
        <div
          onClick={() => navigate('/incidents')}
          className={`relative overflow-hidden p-5 rounded-2xl bg-navy-800 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 shadow-lg ${
            metrics.open_incidents > 0 ? 'border-rose-500/50 hover:border-rose-500/80 hover:shadow-glow-red' : 'border-navy-700/80 hover:border-royal/60 hover:shadow-glow-royal'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />
          <div>
            <div className="flex items-center justify-between text-mutedslate mb-1">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider">Open Incidents</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-softwhite">{metrics.open_incidents}</p>
            <p className="text-[11px] text-amber-300 font-mono mt-0.5 font-medium">
              {metrics.critical_high_incidents} Critical / High priority
            </p>
          </div>
          <p className="text-[11px] text-mutedslate mt-3 border-t border-navy-700/60 pt-2 leading-relaxed">
            Confirmed security problems currently open and requiring analyst review.
          </p>
        </div>

        {/* Card 3: High/Critical Priority Alerts */}
        <div
          onClick={() => navigate('/detections')}
          className={`relative overflow-hidden p-5 rounded-2xl bg-navy-800 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 shadow-lg ${
            metrics.critical_high_incidents > 0 ? 'border-amber-500/50 hover:border-amber-500/80 hover:shadow-amber-950/30' : 'border-navy-700/80 hover:border-royal/60 hover:shadow-glow-royal'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />
          <div>
            <div className="flex items-center justify-between text-mutedslate mb-1">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider">High / Critical Alerts</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-softwhite">{metrics.critical_high_incidents}</p>
            <p className="text-[11px] text-mutedslate font-mono mt-0.5 font-medium">
              {metrics.critical_high_incidents > 0 ? 'Requires priority action' : 'No urgent alerts'}
            </p>
          </div>
          <p className="text-[11px] text-mutedslate mt-3 border-t border-navy-700/60 pt-2 leading-relaxed">
            Severe threats identified by rule-based and machine-learning detection engines.
          </p>
        </div>

        {/* Card 4: AI Agents Available */}
        <div
          onClick={() => navigate('/agents')}
          className="relative overflow-hidden p-5 rounded-2xl bg-navy-800 border border-navy-700/80 hover:border-purple-500/60 hover:shadow-glow-purple transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 shadow-lg"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/80 to-transparent" />
          <div>
            <div className="flex items-center justify-between text-mutedslate mb-1">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider">AI Agents</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-300">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-softwhite">{agentSummary.available} / {agentSummary.total}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5 font-medium">
              {agentSummary.investigating > 0 ? `${agentSummary.investigating} investigating` : 'All ready on standby'}
            </p>
          </div>
          <p className="text-[11px] text-mutedslate mt-3 border-t border-navy-700/60 pt-2 leading-relaxed">
            Specialized AI agents ready to analyze events, correlate alerts, and plan responses.
          </p>
        </div>

        {/* Card 5: System Health */}
        <div
          onClick={() => navigate('/health-monitor')}
          className="relative overflow-hidden p-5 rounded-2xl bg-navy-800 border border-navy-700/80 hover:border-emerald-500/60 hover:shadow-emerald-950/20 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 shadow-lg"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent" />
          <div>
            <div className="flex items-center justify-between text-mutedslate mb-1">
              <span className="text-[11px] font-semibold uppercase font-mono tracking-wider">System Health</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-softwhite">
              {isSystemWorking ? 'Online' : 'Attention'}
            </p>
            <p className="text-[11px] text-emerald-400 font-mono mt-0.5 font-medium">
              {Object.values(systemHealth).filter((c) => c.status === 'Online').length}/6 services healthy
            </p>
          </div>
          <p className="text-[11px] text-mutedslate mt-3 border-t border-navy-700/60 pt-2 leading-relaxed">
            Status of the backend API, database, telemetry pipeline, and virtual nodes.
          </p>
        </div>
      </div>

      {/* 4. REAL-TIME TELEMETRY ANALYTICS & RISK GAUGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <div>
          <RiskGauge score={metrics.open_incidents > 0 ? 76 : 24} />
        </div>
      </div>

      {/* 5. WHAT NEEDS YOUR ATTENTION? */}
      <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-softwhite flex items-center space-x-2">
              <AlertOctagon className={`w-5 h-5 ${attentionItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>What Needs Your Attention?</span>
              {attentionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {attentionItems.length} action{attentionItems.length > 1 ? 's' : ''} needed
                </span>
              )}
            </h2>
            <p className="text-xs text-mutedslate mt-0.5">
              Critical incidents, pending approvals, and system alerts that require administrator action.
            </p>
          </div>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-6 rounded-xl bg-navy-900/60 border border-emerald-500/20 flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-300">All Clear — No Action Required</h4>
              <p className="text-xs text-mutedslate mt-0.5">
                There are no open high-priority incidents, pending response approvals, or collector errors right now.
                You can run a demo scenario from the Demo Attack Lab to test threat detection.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-navy-900/80 border border-slate-700/80 hover:border-royal/50 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <SeverityBadge severity={item.severity} size="sm" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-softwhite">{item.title}</h4>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-mutedslate mt-1">{item.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Reported: {formatSocTimestamp(item.timestamp)}</p>
                  </div>
                </div>

                <div className="flex-shrink-0 self-end md:self-center">
                  <button
                    onClick={() => navigate(item.action_url)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-royal/20 text-softwhite border border-royal/40 hover:bg-royal/30 text-xs font-semibold font-mono transition"
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

      {/* 4. RECOMMENDED ADMINISTRATOR WORKFLOW */}
      <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl">
        <div className="mb-4">
          <h2 className="text-base font-bold text-softwhite flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-royal-300" />
            <span>Recommended Administrator Workflow</span>
          </h2>
          <p className="text-xs text-mutedslate mt-0.5">
            Follow these 6 steps to triage, analyze, and remediate cybersecurity threats effectively.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Step 1 */}
          <div
            onClick={() => navigate('/health-monitor')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 1
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Check Health</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Confirm API, DB, and collectors are actively ingesting logs.
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>View Health</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => navigate('/events')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 2
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Monitor Events</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Review live event stream for unusual volume or authentication failures.
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>View Events</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => navigate('/detections')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 3
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Review Detections</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Inspect alerts flagged by MITRE rules and anomaly detection models.
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>View Alerts</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => navigate('/incidents')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 4
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Investigate Incidents</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Examine multi-agent root cause analysis and correlated attack paths.
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>Investigate</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 5 */}
          <div
            onClick={() => navigate('/responses')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 5
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Review Responses</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Review SOAR containment actions (e.g. block IP, isolate node).
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>View SOAR</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>

          {/* Step 6 */}
          <div
            onClick={() => navigate('/responses')}
            className="p-3.5 rounded-xl bg-navy-900/70 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-gold uppercase px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">
                Step 6
              </span>
              <h4 className="text-xs font-semibold text-softwhite mt-2">Verify Outcomes</h4>
              <p className="text-[11px] text-mutedslate mt-1 leading-relaxed">
                Audit automated verification checks confirming threat is neutralized.
              </p>
            </div>
            <div className="mt-3 flex items-center text-[10px] text-royal-300 font-mono">
              <span>Verify</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. SIMPLE SECURITY ACTIVITY (Readable Table with Plain English Labels) */}
      <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-3">
          <div>
            <h2 className="text-base font-bold text-softwhite flex items-center space-x-2">
              <Radio className="w-5 h-5 text-royal-300" />
              <span>Recent Security Activity</span>
            </h2>
            <p className="text-xs text-mutedslate mt-0.5">
              Live feed of recent security events translated into simple, readable categories.
            </p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
          >
            <span>Open Full Event Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!data?.recent_events || data.recent_events.length === 0) ? (
          <div className="p-8 text-center text-xs text-mutedslate font-mono bg-navy-900/40 rounded-xl my-4">
            No telemetry events recorded yet. Run a scenario in the Demo Lab to generate activity.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-navy-700/60 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Security Activity</th>
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Source (Who / Where)</th>
                  <th className="py-2.5 px-3">Affected System</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/40 font-mono">
                {data.recent_events.map((evt) => {
                  const friendly = getFriendlyEventCategory(evt);
                  return (
                    <tr
                      key={evt.event_id}
                      onClick={() => navigate('/events')}
                      className="hover:bg-navy-900/60 transition cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${friendly.badgeClass}`}>
                            {friendly.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal mt-0.5 block">
                          Type: {evt.event_type} • Action: {evt.file_action || 'LOGGED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {formatSocTimestamp(evt.timestamp)}
                      </td>
                      <td className="py-3 px-3 text-softwhite">
                        <div className="font-semibold truncate max-w-[150px]">
                          {evt.source_ip || evt.username || 'Local System'}
                        </div>
                        {evt.username && evt.source_ip && (
                          <span className="text-[10px] text-slate-400 block truncate">User: {evt.username}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-softwhite">
                        <div className="truncate max-w-[150px]">{evt.host || evt.destination_ip || 'Internal Network'}</div>
                        {evt.destination_ip && (
                          <span className="text-[10px] text-slate-400 block">IP: {evt.destination_ip}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <SeverityBadge severity={evt.severity} size="sm" />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            evt.is_simulated
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                              : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                          }`}
                        >
                          {evt.is_simulated ? 'Simulated Lab' : 'Live Collector'}
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

      {/* 6. TWO-COLUMN ROW: SIMPLE AI AGENT OVERVIEW & SIMPLE SYSTEM HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simple AI Agent Overview */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-700/80 mb-4">
              <div>
                <h3 className="text-base font-bold text-softwhite flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-royal-300" />
                  <span>AI Agent Overview</span>
                </h3>
                <p className="text-xs text-mutedslate mt-0.5">
                  10 specialized agents continuously investigate threats in the background.
                </p>
              </div>
              <button
                onClick={() => navigate('/agents')}
                className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
              >
                <span>View All Agents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div className="p-2.5 rounded-xl bg-navy-900/80 border border-navy-700">
                <p className="text-[10px] text-mutedslate uppercase font-mono">Total Agents</p>
                <p className="text-lg font-bold font-mono text-softwhite">{agentSummary.total}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-900/80 border border-navy-700">
                <p className="text-[10px] text-mutedslate uppercase font-mono">Available</p>
                <p className="text-lg font-bold font-mono text-emerald-400">{agentSummary.available}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-900/80 border border-navy-700">
                <p className="text-[10px] text-mutedslate uppercase font-mono">Investigating</p>
                <p className="text-lg font-bold font-mono text-royal-200">{agentSummary.investigating}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-navy-900/80 border border-navy-700">
                <p className="text-[10px] text-mutedslate uppercase font-mono">Errors</p>
                <p className={`text-lg font-bold font-mono ${agentSummary.error_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {agentSummary.error_count}
                </p>
              </div>
            </div>

            {/* Agent List (Simplified) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
              {(data?.agent_health || []).map((ag) => (
                <div
                  key={ag.name}
                  onClick={() => navigate('/agents')}
                  className="p-2.5 rounded-lg bg-navy-900/60 border border-slate-700/60 hover:border-royal/50 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-semibold text-softwhite truncate" title={ag.name}>
                      {ag.name.replace(' Agent', '')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {ag.findings_count} findings
                    </p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
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

          <p className="text-[11px] text-mutedslate font-mono mt-4 border-t border-navy-700/60 pt-3">
            Tip: Agents activate automatically when new security events and suspicious detections arrive.
          </p>
        </div>

        {/* Simple System Health */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-700/80 mb-4">
              <div>
                <h3 className="text-base font-bold text-softwhite flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>System Health Check</span>
                </h3>
                <p className="text-xs text-mutedslate mt-0.5">
                  Real-time operational status of core infrastructure and services.
                </p>
              </div>
              <button
                onClick={() => navigate('/health-monitor')}
                className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
              >
                <span>Health Monitor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 6 Core Components */}
            <div className="space-y-2.5">
              {Object.entries(systemHealth).map(([key, comp]) => {
                const isOnline = comp.status === 'Online';
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-navy-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                        }`}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-semibold text-softwhite">{comp.name}</h4>
                          {comp.is_simulated && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-700/40 font-mono">
                              Simulated Lab
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-mutedslate">{comp.details}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        isOnline
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-mutedslate font-mono mt-4 border-t border-navy-700/60 pt-3">
            Note: Virtual nodes execute as local daemons simulating Linux guest telemetry without requiring 6+ GB of kernel hypervisor memory.
          </p>
        </div>
      </div>

      {/* 7. GLOSSARY / BEGINNER'S GUIDE MODAL */}
      {showGlossary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-navy-700">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-royal/20 flex items-center justify-center text-royal-300">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-softwhite">Beginner's SOC Glossary & Terms</h3>
                  <p className="text-xs text-mutedslate">Plain-language explanations of cybersecurity concepts</p>
                </div>
              </div>
              <button
                onClick={() => setShowGlossary(false)}
                className="p-1 rounded-lg text-mutedslate hover:text-softwhite hover:bg-navy-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="my-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search technical terms (e.g. Incident, Severity, SOAR)..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full bg-navy-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-softwhite focus:outline-none focus:border-royal/70 placeholder:text-slate-500 font-mono"
              />
            </div>

            {/* Glossary list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredGlossary.map((item) => (
                <div key={item.term} className="p-3.5 rounded-xl bg-navy-950/60 border border-navy-800">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-softwhite">{item.term}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-royal/20 text-royal-300 border border-royal/30">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.definition}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-navy-700 flex justify-end">
              <button
                onClick={() => setShowGlossary(false)}
                className="px-4 py-2 rounded-xl bg-royal text-softwhite text-xs font-semibold hover:bg-royal/80 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
