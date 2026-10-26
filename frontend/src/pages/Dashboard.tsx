import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardData } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Radio,
  Bot,
  Zap,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  Activity,
  Server,
  ArrowRight,
  RefreshCw,
  Play
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

import { useWebSocket } from '../context/WebSocketContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard summary', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000); // Background heartbeat fallback
    return () => clearInterval(interval);
  }, []);

  // Real-time streaming WebSocket subscriptions
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (newEvent: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedRecent = [newEvent, ...(prev.recent_events || []).slice(0, 5)];
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
    });

    const unsub2 = subscribe('AGENT_STATUS_CHANGED', (agentUpdate: any) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedAgents = (prev.agent_health || []).map((ag) => {
          if (ag.name === agentUpdate.name) {
            return {
              ...ag,
              status: agentUpdate.status,
              last_run: new Date().toLocaleTimeString(),
              findings_count: (agentUpdate.findings_count !== undefined) ? agentUpdate.findings_count : ag.findings_count
            };
          }
          return ag;
        });
        return { ...prev, agent_health: updatedAgents };
      });
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
          <p className="text-sm text-mutedslate font-mono">Synchronizing SOC Command Center telemetry...</p>
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
    idle_agents: 0,
    error_agents: 0,
    incidents_awaiting_investigation: 0,
    actions_pending_approval: 0,
    contained_threats: 0,
    verification_failures: 0
  };

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: '#F05265',
    HIGH: '#FB7185',
    MEDIUM: '#F4B942',
    LOW: '#2DBE85',
    INFO: '#6D5AE6',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>SOC COMMAND CENTER</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono font-medium">
              LIVE TELEMETRY
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Autonomous Multi-Agent Threat Detection, Attack-Path Correlation & SOAR Containment
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/demo')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition text-xs font-semibold font-mono"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Attack Scenario</span>
          </button>

          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Security Events"
          value={metrics.total_events.toLocaleString()}
          subtitle={`${metrics.events_in_timerange} received in last 24h`}
          icon={<Radio className="w-5 h-5" />}
          variant="default"
          onClick={() => navigate('/events')}
        />
        <MetricCard
          title="Active Incidents"
          value={metrics.open_incidents}
          subtitle={`${metrics.critical_high_incidents} Critical / High priority`}
          icon={<ShieldAlert className="w-5 h-5" />}
          variant={metrics.critical_high_incidents > 0 ? 'danger' : 'warning'}
          onClick={() => navigate('/incidents')}
        />
        <MetricCard
          title="Autonomous AI Agents"
          value={`${metrics.active_agents} / 10`}
          subtitle="Specialized analysis agents active"
          icon={<Bot className="w-5 h-5" />}
          variant="royal"
          onClick={() => navigate('/agents')}
        />
        <MetricCard
          title="Threats Contained"
          value={metrics.contained_threats}
          subtitle={`${metrics.actions_pending_approval} actions pending approval`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
          onClick={() => navigate('/responses')}
        />
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl bg-navy-800 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-mutedslate font-mono uppercase">Awaiting Investigation</p>
            <p className="text-lg font-bold font-mono text-softwhite">{metrics.incidents_awaiting_investigation}</p>
          </div>
          <AlertOctagon className="w-5 h-5 text-socwarning" />
        </div>
        <div className="p-3.5 rounded-xl bg-navy-800 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-mutedslate font-mono uppercase">Actions Pending Approval</p>
            <p className="text-lg font-bold font-mono text-softwhite">{metrics.actions_pending_approval}</p>
          </div>
          <Zap className="w-5 h-5 text-gold" />
        </div>
        <div className="p-3.5 rounded-xl bg-navy-800 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-mutedslate font-mono uppercase">Verification Failures</p>
            <p className="text-lg font-bold font-mono text-softwhite">{metrics.verification_failures}</p>
          </div>
          <ShieldAlert className="w-5 h-5 text-soccritical" />
        </div>
        <div className="p-3.5 rounded-xl bg-navy-800 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-mutedslate font-mono uppercase">Containment Success Rate</p>
            <p className="text-lg font-bold font-mono text-socsuccess">
              {metrics.contained_threats > 0 ? '100%' : 'N/A'}
            </p>
          </div>
          <TrendingUp className="w-5 h-5 text-socsuccess" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-softwhite">Security Event & Alert Velocity</h3>
              <p className="text-xs text-mutedslate font-mono">Aggregated telemetry flow over recent time slots</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.event_trends || []}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6D5AE6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6D5AE6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F05265" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F05265" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#111A2E', borderColor: '#23345A', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="events_count" name="Events" stroke="#6D5AE6" fillOpacity={1} fill="url(#colorEvents)" />
                <Area type="monotone" dataKey="alerts_count" name="Alerts" stroke="#F05265" fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-semibold text-softwhite mb-1">Severity Distribution</h3>
          <p className="text-xs text-mutedslate font-mono mb-4">Breakdown across ingested events</p>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.severity_distribution || []}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(data?.severity_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111A2E', borderColor: '#23345A', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-navy-700/60 text-center text-[10px] font-mono">
            {(data?.severity_distribution || []).map((s) => (
              <div key={s.severity} className="p-1 rounded bg-navy-900/60">
                <span className="text-mutedslate">{s.severity}: </span>
                <span className="text-softwhite font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agents Health Panel */}
      <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-softwhite flex items-center space-x-2">
              <Bot className="w-4 h-4 text-royal-200" />
              <span>Specialized Autonomous Security Agents (10 Agents)</span>
            </h3>
            <p className="text-xs text-mutedslate font-mono">Live execution status, health and findings count</p>
          </div>
          <button
            onClick={() => navigate('/agents')}
            className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
          >
            <span>View All Runs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(data?.agent_health || []).map((agent) => (
            <div
              key={agent.name}
              onClick={() => navigate('/agents')}
              className="p-3 rounded-xl bg-navy-900/90 border border-slate-700/60 hover:border-royal/50 transition cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-2 h-2 rounded-full bg-socsuccess" />
                <StatusBadge status={agent.status} />
              </div>
              <h4 className="text-xs font-semibold text-softwhite truncate" title={agent.name}>
                {agent.name.replace(' Agent', '')}
              </h4>
              <p className="text-[10px] text-mutedslate mt-1 font-mono">
                Findings: <span className="text-gold font-bold">{agent.findings_count}</span>
              </p>
              <p className="text-[9px] text-slate-500 font-mono truncate">
                Last: {agent.last_run || 'Idle'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Recent Incidents & Event Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents Table */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-softwhite">Recent Critical & High Incidents</h3>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.recent_critical_incidents || data.recent_critical_incidents.length === 0) ? (
              <div className="p-6 text-center text-xs text-mutedslate font-mono bg-navy-900/40 rounded-xl">
                No active critical incidents. Run a Demo Scenario to populate.
              </div>
            ) : (
              data.recent_critical_incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                  className="p-3.5 rounded-xl bg-navy-900/80 border border-slate-700/70 hover:border-royal/60 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <SeverityBadge severity={inc.severity} size="sm" />
                    <div>
                      <h4 className="text-xs font-semibold text-softwhite truncate max-w-xs">{inc.title}</h4>
                      <p className="text-[10px] text-mutedslate font-mono mt-0.5">
                        {inc.incident_id} • Risk Score: <span className="text-gold font-bold">{inc.risk_score}/100</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={inc.status} />
                    <ArrowRight className="w-4 h-4 text-mutedslate" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Security Event Stream */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-softwhite">Live Telemetry Ingestion Stream</h3>
            <button
              onClick={() => navigate('/events')}
              className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1"
            >
              <span>Open Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {(!data?.recent_events || data.recent_events.length === 0) ? (
              <div className="p-6 text-center text-xs text-mutedslate bg-navy-900/40 rounded-xl">
                No telemetry events found. Use Data Ingestion or Demo Lab.
              </div>
            ) : (
              data.recent_events.map((evt) => (
                <div
                  key={evt.event_id}
                  onClick={() => navigate('/events')}
                  className="p-2.5 rounded-lg bg-navy-900/60 border border-slate-800 flex items-center justify-between hover:bg-navy-900 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <SeverityBadge severity={evt.severity} size="sm" />
                    <span className="text-royal-200 uppercase font-semibold text-[11px] truncate">
                      {evt.event_type}
                    </span>
                    <span className="text-mutedslate truncate">
                      {evt.source_ip || evt.host || evt.username}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{evt.file_action || 'LOGGED'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
