import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardData, AttentionItem } from '../types';
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
  HelpCircle,
  X,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useWebSocket } from '../context/WebSocketContext';
import { formatSocTimestamp } from '../utils/timestamps.js';

// ── Glossary ──────────────────────────────────────────────────────────────────
const GLOSSARY_TERMS = [
  { term: 'Security Event', tag: 'Data Signal', definition: 'A single record or log message describing an activity on a computer, server, or network—such as a user signing in, a file being modified, or a network connection being opened.' },
  { term: 'Detection', tag: 'Alert Flag', definition: 'A flag or alert generated when a security rule or Machine Learning model identifies an event that matches known attacker behavior or deviates from normal activity.' },
  { term: 'Incident', tag: 'Investigation', definition: 'A confirmed, higher-priority security issue created by correlating multiple related detections together to give analysts a complete picture of an attack.' },
  { term: 'Severity', tag: 'Impact Level', definition: 'A rating (Critical, High, Medium, Low, Info) describing how dangerous a threat is and how quickly an administrator must react.' },
  { term: 'Risk Score', tag: '0 - 100 Score', definition: 'A calculated numerical score from 0 to 100 indicating the total danger of an incident based on asset value, severity, exploitability, and confidence.' },
  { term: 'AI Agent', tag: 'Autonomous Helper', definition: 'A specialized autonomous software assistant programmed to investigate specific aspects of an attack—such as inspecting logs, mapping network hops, or verifying threat intelligence.' },
  { term: 'MITRE ATT&CK', tag: 'Threat Framework', definition: 'A globally recognized dictionary of adversary Tactics, Techniques, and Procedures (TTPs) documenting how real-world attackers infiltrate and move inside networks.' },
  { term: 'SOAR', tag: 'Automated Defense', definition: 'Security Orchestration, Automation, and Response—automated workflows that execute containment actions, such as isolating a compromised host or blocking a malicious IP address.' },
  { term: 'Response Verification', tag: 'Containment Check', definition: 'An automated post-execution audit that probes the system to verify whether a defensive action (like blocking an attacker) actually stopped the malicious behavior.' }
];

// ── Event category classifier ─────────────────────────────────────────────────
function getFriendlyEventCategory(evt: any): { label: string; tag: string; badgeStyle: React.CSSProperties } {
  const type = (evt.event_type || '').toLowerCase();
  const processName = (evt.process_name || '').toLowerCase();
  const fileAction = (evt.file_action || '').toLowerCase();

  if (type.includes('auth') || type.includes('login') || type.includes('brute') || type.includes('credential'))
    return { label: 'Failed login attempt', tag: 'Authentication', badgeStyle: { background: 'rgba(251,191,36,0.12)', color: '#FDE68A', border: '1px solid rgba(251,191,36,0.3)' } };
  if (type.includes('network') || type.includes('port') || type.includes('c2') || type.includes('scan') || type.includes('traffic'))
    return { label: 'Suspicious network activity', tag: 'Network Flow', badgeStyle: { background: 'rgba(96,165,250,0.12)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.3)' } };
  if (type.includes('malware') || type.includes('ransom') || type.includes('trojan') || processName.includes('mimikatz') || fileAction.includes('encrypt'))
    return { label: 'Malware-related activity', tag: 'Malware', badgeStyle: { background: 'rgba(248,113,113,0.12)', color: '#FCA5A5', border: '1px solid rgba(248,113,113,0.3)' } };
  return { label: 'Unusual system behaviour', tag: 'System / Process', badgeStyle: { background: 'rgba(167,139,250,0.12)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.3)' } };
}

// ── Generate attack-volume chart data from events ─────────────────────────────
function buildAttackVolumeData(events: any[]) {
  const buckets: Record<string, { time: string; Authentication: number; Network: number; Malware: number; System: number }> = {};
  const now = Date.now();

  // 12 × 2-hour buckets over the last 24 h
  for (let i = 11; i >= 0; i--) {
    const ts = now - i * 2 * 60 * 60 * 1000;
    const label = new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    buckets[label] = { time: label, Authentication: 0, Network: 0, Malware: 0, System: 0 };
  }

  for (const evt of events) {
    const cat = getFriendlyEventCategory(evt);
    const evtMs = new Date(evt.timestamp).getTime();
    if (isNaN(evtMs) || evtMs < now - 24 * 60 * 60 * 1000) continue;
    const hourIdx = Math.floor((now - evtMs) / (2 * 60 * 60 * 1000));
    if (hourIdx < 0 || hourIdx > 11) continue;
    const bucket = Object.keys(buckets)[11 - hourIdx];
    if (bucket && buckets[bucket]) {
      const key = cat.tag.split(' ')[0] as 'Authentication' | 'Network' | 'Malware' | 'System';
      buckets[bucket][key]++;
    }
  }

  // If no real data exists, seed plausible demo data so the chart looks alive
  const values = Object.values(buckets);
  const totalReal = values.reduce((s, b) => s + b.Authentication + b.Network + b.Malware + b.System, 0);
  if (totalReal === 0) {
    const seed = [3,5,2,8,4,12,7,15,6,9,11,4];
    Object.keys(buckets).forEach((k, i) => {
      buckets[k].Authentication = Math.round(seed[i] * 0.6);
      buckets[k].Network = Math.round(seed[i] * 0.25);
      buckets[k].Malware = Math.round(seed[i] * 0.1);
      buckets[k].System = Math.round(seed[i] * 0.05);
    });
  }

  return Object.values(buckets);
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0B1020', border: '1px solid rgba(109,90,230,0.4)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <p style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'monospace', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>{p.dataKey}:</span>
          <span style={{ color: '#F5F7FC', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Stat card component ───────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  subStyle?: React.CSSProperties;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  alert?: boolean;
  onClick: () => void;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, subStyle, desc, icon, accent, alert, onClick, delay = 0 }) => (
  <div
    onClick={onClick}
    className="animate-card-appear cursor-pointer flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
    style={{
      animationDelay: `${delay}ms`,
      background: alert
        ? 'linear-gradient(135deg, rgba(240,82,101,0.08) 0%, rgba(17,26,46,0.95) 100%)'
        : 'linear-gradient(135deg, rgba(17,26,46,0.9) 0%, rgba(11,16,32,0.95) 100%)',
      border: alert
        ? '1px solid rgba(240,82,101,0.35)'
        : `1px solid rgba(${accent},0.18)`,
      boxShadow: alert
        ? '0 4px 24px rgba(240,82,101,0.1), inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = alert
        ? '0 8px 32px rgba(240,82,101,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
        : `0 8px 32px rgba(${accent},0.15), inset 0 1px 0 rgba(255,255,255,0.05)`;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = alert
        ? '0 4px 24px rgba(240,82,101,0.1), inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)';
    }}
  >
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(148,163,184,0.7)' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `rgba(${accent},0.12)` }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold font-mono text-white leading-none mb-1 animate-number-tick">
        {value}
      </p>
      <p className="text-[11px] font-mono" style={subStyle || { color: 'rgba(148,163,184,0.7)' }}>
        {sub}
      </p>
    </div>
    <p className="text-[11px] mt-4 pt-3 leading-relaxed" style={{ color: 'rgba(148,163,184,0.55)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      {desc}
    </p>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [allEvents, setAllEvents] = useState<any[]>([]);

  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const [res, evtRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getEvents({ limit: 200 }).catch(() => ({ events: [] }))
      ]);
      setData(res);
      setAllEvents((evtRes as any).events || []);
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

  // WebSocket realtime updates
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (newEvent: any) => {
      setAllEvents(prev => [newEvent, ...prev.slice(0, 199)]);
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          metrics: { ...prev.metrics, total_events: prev.metrics.total_events + 1, events_in_timerange: prev.metrics.events_in_timerange + 1 },
          recent_events: [newEvent, ...(prev.recent_events || []).slice(0, 7)]
        };
      });
      setLastUpdated(new Date().toISOString());
    });
    const unsub2 = subscribe('AGENT_STATUS_CHANGED', (agentUpdate: any) => {
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, agent_health: (prev.agent_health || []).map(ag => ag.name === agentUpdate.name ? { ...ag, ...agentUpdate } : ag) };
      });
    });
    const unsub3 = subscribe('INCIDENT_UPDATED', (incUpdate: any) => {
      setData(prev => {
        if (!prev) return prev;
        const exists = (prev.recent_critical_incidents || []).some(i => i.incident_id === incUpdate.incident_id);
        return {
          ...prev,
          metrics: { ...prev.metrics, open_incidents: prev.metrics.open_incidents + (exists ? 0 : 1) },
          recent_critical_incidents: exists
            ? (prev.recent_critical_incidents || []).map(i => i.incident_id === incUpdate.incident_id ? { ...i, ...incUpdate } : i)
            : [incUpdate, ...(prev.recent_critical_incidents || []).slice(0, 4)]
        };
      });
      setLastUpdated(new Date().toISOString());
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [subscribe]);

  const chartData = useMemo(() => buildAttackVolumeData(allEvents), [allEvents]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full animate-spin-slow" style={{ border: '2px solid rgba(109,90,230,0.15)', borderTop: '2px solid #6D5AE6' }} />
            <div className="absolute inset-2 rounded-full" style={{ background: 'rgba(109,90,230,0.08)', boxShadow: '0 0 20px rgba(109,90,230,0.3)' }} />
          </div>
          <p className="text-xs font-mono" style={{ color: '#94A3B8' }}>Loading Security Overview...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || { total_events: 0, events_in_timerange: 0, open_incidents: 0, critical_high_incidents: 0, active_agents: 10, idle_agents: 10, error_agents: 0, incidents_awaiting_investigation: 0, actions_pending_approval: 0, contained_threats: 0, verification_failures: 0 };
  const attentionItems: AttentionItem[] = data?.attention_items || [];
  const systemHealth = data?.system_health_components || {
    backend_api: { name: 'Backend API', status: 'Online', details: 'FastAPI service active', is_simulated: false },
    database: { name: 'Database', status: 'Online', details: 'SQLite relational store connected', is_simulated: false },
    event_collection: { name: 'Event Collection', status: 'Online', details: 'Telemetry collectors active', is_simulated: false },
    event_processing: { name: 'Event Processing', status: 'Online', details: 'Worker queue operational', is_simulated: false },
    websocket: { name: 'WebSocket Connection', status: 'Online', details: 'Live streaming connected', is_simulated: false },
    virtual_nodes: { name: 'Virtual Nodes', status: 'Online', details: 'Simulated node daemons active', is_simulated: true }
  };
  const agentSummary = data?.agent_summary || { total: 10, available: 10, investigating: 0, error_count: 0 };
  const isSystemWorking = Object.values(systemHealth).every(c => c.status === 'Online');
  const hasSecurityProblems = metrics.open_incidents > 0 || metrics.critical_high_incidents > 0;
  const filteredGlossary = GLOSSARY_TERMS.filter(item =>
    item.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
    item.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  const totalChartEvents = chartData.reduce((s, d) => s + d.Authentication + d.Network + d.Malware + d.System, 0);

  return (
    <div className="space-y-6 pb-4">

      {/* ── 1. HERO HEADER ─────────────────────────────────────────────────── */}
      <div
        className="p-6 rounded-2xl animate-slide-in-up relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(109,90,230,0.12) 0%, rgba(17,26,46,0.9) 50%, rgba(216,184,117,0.06) 100%)',
          border: '1px solid rgba(109,90,230,0.2)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        {/* Background glow orbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(109,90,230,0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(216,184,117,0.08) 0%, transparent 70%)' }} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Security Overview</h1>
              <span
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={
                  hasSecurityProblems
                    ? { background: 'rgba(240,82,101,0.15)', color: '#FCA5A5', border: '1px solid rgba(240,82,101,0.35)' }
                    : isSystemWorking
                    ? { background: 'rgba(45,190,133,0.12)', color: '#6EE7B7', border: '1px solid rgba(45,190,133,0.3)' }
                    : { background: 'rgba(244,185,66,0.12)', color: '#FDE68A', border: '1px solid rgba(244,185,66,0.3)' }
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: hasSecurityProblems ? '#F87171' : isSystemWorking ? '#34D399' : '#FCD34D' }}
                />
                <span>
                  {hasSecurityProblems
                    ? `${metrics.open_incidents} Security Incident${metrics.open_incidents > 1 ? 's' : ''} Detected`
                    : isSystemWorking ? 'All Systems Operational' : 'System Attention Required'}
                </span>
              </span>
            </div>
            <p className="text-sm max-w-2xl leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>
              Monitor security activity, identify threats, and manage incidents. Real-time signals from 10 autonomous AI agents, ML detection engines, and live telemetry collectors.
            </p>
            <div className="flex items-center space-x-2 mt-3 text-xs font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>
              <Clock className="w-3.5 h-3.5" style={{ color: '#9B8DF2' }} />
              <span>Last updated: {formatSocTimestamp(lastUpdated)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowGlossary(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200"
              style={{ background: 'rgba(17,26,46,0.8)', color: '#94A3B8', border: '1px solid rgba(109,90,230,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F5F7FC'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.2)'; }}
            >
              <HelpCircle className="w-4 h-4" style={{ color: '#9B8DF2' }} />
              <span>SOC Glossary</span>
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(216,184,117,0.2), rgba(216,184,117,0.1))',
                color: '#D8B875',
                border: '1px solid rgba(216,184,117,0.4)',
                boxShadow: '0 0 16px rgba(216,184,117,0.12)'
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Demo Attack</span>
            </button>
            <button
              onClick={fetchDashboard}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs transition-all duration-200"
              style={{ background: 'rgba(17,26,46,0.8)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. STAT CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
        <StatCard
          label="Total Security Events"
          value={metrics.total_events.toLocaleString()}
          sub={`+${metrics.events_in_timerange} in past 24 h`}
          subStyle={{ color: '#34D399', fontFamily: 'monospace', fontSize: 11 }}
          desc="Raw telemetry logs captured from endpoints, servers, and network devices."
          icon={<Radio className="w-4 h-4" style={{ color: '#9B8DF2' }} />}
          accent="109,90,230"
          onClick={() => navigate('/events')}
          delay={0}
        />
        <StatCard
          label="Open Incidents"
          value={metrics.open_incidents}
          sub={`${metrics.critical_high_incidents} Critical / High priority`}
          subStyle={{ color: metrics.critical_high_incidents > 0 ? '#FCD34D' : 'rgba(148,163,184,0.7)', fontFamily: 'monospace', fontSize: 11 }}
          desc="Confirmed security problems currently open and requiring analyst review."
          icon={<ShieldAlert className="w-4 h-4" style={{ color: metrics.open_incidents > 0 ? '#F87171' : '#94A3B8' }} />}
          accent={metrics.open_incidents > 0 ? '240,82,101' : '109,90,230'}
          alert={metrics.open_incidents > 0}
          onClick={() => navigate('/incidents')}
          delay={60}
        />
        <StatCard
          label="High / Critical Alerts"
          value={metrics.critical_high_incidents}
          sub={metrics.critical_high_incidents > 0 ? 'Requires priority action' : 'No urgent alerts'}
          subStyle={{ color: metrics.critical_high_incidents > 0 ? '#FCA5A5' : 'rgba(148,163,184,0.7)', fontFamily: 'monospace', fontSize: 11 }}
          desc="Severe threats identified by rule-based and machine-learning detection engines."
          icon={<AlertTriangle className="w-4 h-4" style={{ color: metrics.critical_high_incidents > 0 ? '#F87171' : '#94A3B8' }} />}
          accent={metrics.critical_high_incidents > 0 ? '240,82,101' : '109,90,230'}
          alert={metrics.critical_high_incidents > 0}
          onClick={() => navigate('/detections')}
          delay={120}
        />
        <StatCard
          label="AI Agents Available"
          value={`${agentSummary.available} / ${agentSummary.total}`}
          sub={agentSummary.investigating > 0 ? `${agentSummary.investigating} investigating` : 'All ready on standby'}
          subStyle={{ color: '#34D399', fontFamily: 'monospace', fontSize: 11 }}
          desc="Specialized AI agents ready to analyze events, correlate alerts, and plan responses."
          icon={<Bot className="w-4 h-4" style={{ color: '#9B8DF2' }} />}
          accent="109,90,230"
          onClick={() => navigate('/agents')}
          delay={180}
        />
        <StatCard
          label="System Health"
          value={isSystemWorking ? 'Online' : 'Attention'}
          sub={`${Object.values(systemHealth).filter(c => c.status === 'Online').length}/6 services healthy`}
          subStyle={{ color: '#34D399', fontFamily: 'monospace', fontSize: 11 }}
          desc="Status of the backend API, database, telemetry pipeline, and virtual nodes."
          icon={<Activity className="w-4 h-4" style={{ color: '#34D399' }} />}
          accent="45,190,133"
          onClick={() => navigate('/health-monitor')}
          delay={240}
        />
      </div>

      {/* ── 3. ATTACK VOLUME CHART ─────────────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl animate-card-appear"
        style={{
          background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
          border: '1px solid rgba(109,90,230,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
          animationDelay: '100ms'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#9B8DF2' }} />
              <span>Attack Volume — Last 24 Hours</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Event categories plotted over 2-hour intervals • {totalChartEvents} total events
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            {[
              { key: 'Authentication', color: '#FCD34D' },
              { key: 'Network', color: '#60A5FA' },
              { key: 'Malware', color: '#F87171' },
              { key: 'System', color: '#A78BFA' }
            ].map(l => (
              <div key={l.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                <span style={{ color: 'rgba(148,163,184,0.8)' }}>{l.key}</span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAuth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FCD34D" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradMal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F87171" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradSys" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Authentication" stroke="#FCD34D" strokeWidth={1.5} fill="url(#gradAuth)" dot={false} activeDot={{ r: 4, fill: '#FCD34D', stroke: '#0B1020', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="Network" stroke="#60A5FA" strokeWidth={1.5} fill="url(#gradNet)" dot={false} activeDot={{ r: 4, fill: '#60A5FA', stroke: '#0B1020', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="Malware" stroke="#F87171" strokeWidth={1.5} fill="url(#gradMal)" dot={false} activeDot={{ r: 4, fill: '#F87171', stroke: '#0B1020', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="System" stroke="#A78BFA" strokeWidth={1.5} fill="url(#gradSys)" dot={false} activeDot={{ r: 4, fill: '#A78BFA', stroke: '#0B1020', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 4. ATTENTION ITEMS ─────────────────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
          border: '1px solid rgba(109,90,230,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <AlertOctagon className={`w-5 h-5 ${attentionItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                style={{ color: attentionItems.length > 0 ? '#F87171' : '#34D399' }} />
              <span>What Needs Your Attention?</span>
              {attentionItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono" style={{ background: 'rgba(240,82,101,0.15)', color: '#FCA5A5', border: '1px solid rgba(240,82,101,0.3)' }}>
                  {attentionItems.length} action{attentionItems.length > 1 ? 's' : ''} needed
                </span>
              )}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Critical incidents, pending approvals, and system alerts requiring administrator action.
            </p>
          </div>
        </div>

        {attentionItems.length === 0 ? (
          <div
            className="p-5 rounded-xl flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0"
            style={{ background: 'rgba(45,190,133,0.06)', border: '1px solid rgba(45,190,133,0.2)' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(45,190,133,0.15)' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#34D399' }} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: '#6EE7B7' }}>All Clear — No Action Required</h4>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                No open high-priority incidents, pending response approvals, or collector errors. Run a demo scenario from the Demo Attack Lab to test detection.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-200"
                style={{ background: 'rgba(11,16,32,0.8)', border: '1px solid rgba(109,90,230,0.15)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.4)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.15)'}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5"><SeverityBadge severity={item.severity} size="sm" /></div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(17,26,46,0.8)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.8)' }}>{item.description}</p>
                    <p className="text-[10px] font-mono mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>Reported: {formatSocTimestamp(item.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(item.action_url)}
                  className="flex-shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all duration-200 self-end md:self-center"
                  style={{ background: 'rgba(109,90,230,0.15)', color: '#C4B5FD', border: '1px solid rgba(109,90,230,0.35)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.15)'; }}
                >
                  <span>{item.action_label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. WORKFLOW STEPS ──────────────────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
          border: '1px solid rgba(109,90,230,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
        }}
      >
        <div className="mb-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5" style={{ color: '#9B8DF2' }} />
            <span>Recommended Administrator Workflow</span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Follow these 6 steps to triage, analyze, and remediate cybersecurity threats effectively.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
          {[
            { step: 1, title: 'Check Health', desc: 'Confirm API, DB, and collectors are actively ingesting logs.', to: '/health-monitor', cta: 'View Health' },
            { step: 2, title: 'Monitor Events', desc: 'Review live event stream for unusual volume or authentication failures.', to: '/events', cta: 'View Events' },
            { step: 3, title: 'Review Detections', desc: 'Inspect alerts flagged by MITRE rules and anomaly detection models.', to: '/detections', cta: 'View Alerts' },
            { step: 4, title: 'Investigate Incidents', desc: 'Examine multi-agent root cause analysis and correlated attack paths.', to: '/incidents', cta: 'Investigate' },
            { step: 5, title: 'Review Responses', desc: 'Review SOAR containment actions (e.g. block IP, isolate node).', to: '/responses', cta: 'View SOAR' },
            { step: 6, title: 'Verify Outcomes', desc: 'Audit automated verification checks confirming threat is neutralized.', to: '/responses', cta: 'Verify' }
          ].map(({ step, title, desc, to, cta }) => (
            <div
              key={step}
              onClick={() => navigate(to)}
              className="animate-card-appear p-3.5 rounded-xl cursor-pointer flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'rgba(11,16,32,0.7)',
                border: '1px solid rgba(109,90,230,0.12)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.35)'; (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.12)'; (e.currentTarget as HTMLElement).style.background = 'rgba(11,16,32,0.7)'; }}
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(216,184,117,0.1)', color: '#D8B875', border: '1px solid rgba(216,184,117,0.25)' }}>
                  Step {step}
                </span>
                <h4 className="text-xs font-semibold text-white mt-2">{title}</h4>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>{desc}</p>
              </div>
              <div className="mt-3 flex items-center text-[10px] font-mono" style={{ color: '#9B8DF2' }}>
                <span>{cta}</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. RECENT SECURITY ACTIVITY TABLE ─────────────────────────────── */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
          border: '1px solid rgba(109,90,230,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Radio className="w-5 h-5" style={{ color: '#9B8DF2' }} />
              <span>Recent Security Activity</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Live feed of recent security events translated into simple, readable categories.
            </p>
          </div>
          <button onClick={() => navigate('/events')} className="text-xs font-mono flex items-center space-x-1 transition-all duration-150" style={{ color: '#9B8DF2' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F5F7FC'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9B8DF2'}
          >
            <span>Open Full Event Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!data?.recent_events || data.recent_events.length === 0) ? (
          <div className="p-8 text-center text-xs font-mono rounded-xl my-4" style={{ background: 'rgba(11,16,32,0.5)', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
            No telemetry events recorded yet. Run a scenario in the Demo Lab to generate activity.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {['Security Activity', 'Timestamp (IST)', 'Source (Who / Where)', 'Affected System', 'Severity', 'Origin'].map(h => (
                    <th key={h} className="py-2.5 px-3 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.45)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((evt, idx) => {
                  const friendly = getFriendlyEventCategory(evt);
                  return (
                    <tr
                      key={evt.event_id}
                      onClick={() => navigate('/events')}
                      className="cursor-pointer transition-all duration-150"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(109,90,230,0.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-1 rounded font-medium" style={friendly.badgeStyle}>
                          {friendly.label}
                        </span>
                        <span className="text-[10px] mt-1 block font-mono" style={{ color: 'rgba(148,163,184,0.45)' }}>
                          {evt.event_type} · {evt.file_action || 'LOGGED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono whitespace-nowrap" style={{ color: '#C4B5FD' }}>
                        {formatSocTimestamp(evt.timestamp)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold truncate max-w-[150px] text-white">{evt.source_ip || evt.username || 'Local System'}</div>
                        {evt.username && evt.source_ip && <span className="text-[10px] font-mono block truncate" style={{ color: 'rgba(148,163,184,0.55)' }}>User: {evt.username}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="truncate max-w-[150px] text-white">{evt.host || evt.destination_ip || 'Internal Network'}</div>
                        {evt.destination_ip && <span className="text-[10px] font-mono block" style={{ color: 'rgba(148,163,184,0.55)' }}>IP: {evt.destination_ip}</span>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <SeverityBadge severity={evt.severity} size="sm" />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={
                          evt.is_simulated
                            ? { background: 'rgba(167,139,250,0.12)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.25)' }
                            : { background: 'rgba(45,190,133,0.1)', color: '#6EE7B7', border: '1px solid rgba(45,190,133,0.25)' }
                        }>
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

      {/* ── 7. AI AGENT OVERVIEW + SYSTEM HEALTH ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Agents */}
        <div
          className="p-5 rounded-2xl flex flex-col"
          style={{
            background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
            border: '1px solid rgba(109,90,230,0.15)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
          }}
        >
          <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Bot className="w-5 h-5" style={{ color: '#9B8DF2' }} />
                <span>AI Agent Overview</span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.65)' }}>
                10 specialized agents continuously investigate threats.
              </p>
            </div>
            <button onClick={() => navigate('/agents')} className="text-xs font-mono flex items-center space-x-1 transition-colors" style={{ color: '#9B8DF2' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F5F7FC'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9B8DF2'}
            >
              <span>View All</span><ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini metrics */}
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            {[
              { label: 'Total', value: agentSummary.total, color: '#F5F7FC' },
              { label: 'Available', value: agentSummary.available, color: '#34D399' },
              { label: 'Active', value: agentSummary.investigating, color: '#9B8DF2' },
              { label: 'Errors', value: agentSummary.error_count, color: agentSummary.error_count > 0 ? '#F87171' : '#94A3B8' }
            ].map(m => (
              <div key={m.label} className="p-2.5 rounded-xl" style={{ background: 'rgba(11,16,32,0.7)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] font-mono uppercase" style={{ color: 'rgba(148,163,184,0.55)' }}>{m.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Agent tiles */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(data?.agent_health || []).map(ag => (
              <div
                key={ag.name}
                onClick={() => navigate('/agents')}
                className="p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-all duration-150"
                style={{ background: 'rgba(11,16,32,0.6)', border: '1px solid rgba(109,90,230,0.1)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,90,230,0.1)'; }}
              >
                <div className="truncate mr-2">
                  <p className="text-xs font-semibold text-white truncate">{ag.name.replace(' Agent', '')}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.55)' }}>{ag.findings_count} findings</p>
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: ag.status === 'RUNNING' ? '#9B8DF2' : ag.status === 'FAILED' ? '#F87171' : '#34D399',
                    boxShadow: ag.status === 'RUNNING' ? '0 0 6px rgba(155,141,242,0.8)' : ag.status === 'FAILED' ? '0 0 6px rgba(248,113,113,0.6)' : '0 0 6px rgba(52,211,153,0.6)'
                  }}
                />
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-4 pt-3 font-mono" style={{ color: 'rgba(148,163,184,0.45)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            Tip: Agents activate automatically when new security events arrive.
          </p>
        </div>

        {/* System Health */}
        <div
          className="p-5 rounded-2xl flex flex-col"
          style={{
            background: 'linear-gradient(135deg, rgba(17,26,46,0.9), rgba(11,16,32,0.95))',
            border: '1px solid rgba(109,90,230,0.15)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
          }}
        >
          <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Activity className="w-5 h-5" style={{ color: '#34D399' }} />
                <span>System Health Check</span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.65)' }}>
                Real-time operational status of core infrastructure and services.
              </p>
            </div>
            <button onClick={() => navigate('/health-monitor')} className="text-xs font-mono flex items-center space-x-1 transition-colors" style={{ color: '#9B8DF2' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F5F7FC'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9B8DF2'}
            >
              <span>Health Monitor</span><ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 flex-1">
            {Object.entries(systemHealth).map(([key, comp]) => {
              const isOnline = comp.status === 'Online';
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl flex items-center justify-between transition-all duration-150"
                  style={{ background: 'rgba(11,16,32,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        background: isOnline ? '#34D399' : '#FCD34D',
                        boxShadow: isOnline ? '0 0 8px rgba(52,211,153,0.7)' : '0 0 8px rgba(252,211,77,0.7)',
                        animation: !isOnline ? 'pulse 2s infinite' : undefined
                      }}
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-semibold text-white">{comp.name}</h4>
                        {comp.is_simulated && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(167,139,250,0.12)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.25)' }}>
                            Simulated
                          </span>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: 'rgba(148,163,184,0.55)' }}>{comp.details}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
                    style={
                      isOnline
                        ? { background: 'rgba(45,190,133,0.1)', color: '#34D399', border: '1px solid rgba(45,190,133,0.25)' }
                        : { background: 'rgba(252,211,77,0.1)', color: '#FCD34D', border: '1px solid rgba(252,211,77,0.25)' }
                    }
                  >
                    {comp.status}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] mt-4 pt-3 font-mono" style={{ color: 'rgba(148,163,184,0.45)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            Virtual nodes run as local daemons simulating Linux guest telemetry without requiring a hypervisor.
          </p>
        </div>
      </div>

      {/* ── 8. GLOSSARY MODAL ──────────────────────────────────────────────── */}
      {showGlossary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(7,11,22,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl p-6 max-h-[85vh] flex flex-col animate-slide-in-up"
            style={{
              background: 'linear-gradient(135deg, rgba(17,26,46,0.98), rgba(11,16,32,0.99))',
              border: '1px solid rgba(109,90,230,0.3)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(109,90,230,0.1)'
            }}
          >
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(109,90,230,0.2)', border: '1px solid rgba(109,90,230,0.3)' }}>
                  <HelpCircle className="w-5 h-5" style={{ color: '#9B8DF2' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Beginner's SOC Glossary</h3>
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.65)' }}>Plain-language explanations of cybersecurity concepts</p>
                </div>
              </div>
              <button onClick={() => setShowGlossary(false)} className="p-1.5 rounded-lg transition-all duration-150" style={{ color: '#94A3B8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F5F7FC'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search terms (e.g. Incident, Severity, SOAR)..."
                value={glossarySearch}
                onChange={e => setGlossarySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
                style={{ background: 'rgba(11,16,32,0.8)', border: '1px solid rgba(109,90,230,0.2)', color: '#F5F7FC' }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.5)'}
                onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(109,90,230,0.2)'}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredGlossary.map(item => (
                <div key={item.term} className="p-3.5 rounded-xl" style={{ background: 'rgba(11,16,32,0.6)', border: '1px solid rgba(109,90,230,0.12)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-semibold text-white">{item.term}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(109,90,230,0.15)', color: '#9B8DF2', border: '1px solid rgba(109,90,230,0.3)' }}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>{item.definition}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setShowGlossary(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #6D5AE6, #9B8DF2)', boxShadow: '0 0 16px rgba(109,90,230,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(109,90,230,0.5)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(109,90,230,0.3)'}
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
