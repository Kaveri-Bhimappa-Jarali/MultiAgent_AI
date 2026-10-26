import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Incident } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, RefreshCw, Filter, Users, Laptop, Zap } from 'lucide-react';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const navigate = useNavigate();

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.getIncidents({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setIncidents(res);
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>INCIDENT MANAGEMENT & CORRELATION</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              SIEM & SOAR
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Unified multi-stage attack incidents correlated by the autonomous Correlation and Investigation Agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchIncidents}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-navy-800 border border-slate-800 font-mono text-xs">
        <Filter className="w-4 h-4 text-mutedslate mr-1" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-navy-900 border border-slate-700 rounded-xl px-3 py-1.5 text-softwhite focus:border-royal outline-none"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="CONTAINED">Contained</option>
          <option value="RESOLVED">Resolved</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-navy-900 border border-slate-700 rounded-xl px-3 py-1.5 text-softwhite focus:border-royal outline-none"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <span className="text-mutedslate ml-auto">
          Total Incidents: <span className="text-softwhite font-bold">{incidents.length}</span>
        </span>
      </div>

      {/* Incidents Grid */}
      <div className="space-y-3 font-mono">
        {loading && incidents.length === 0 ? (
          <div className="p-12 text-center text-mutedslate bg-navy-800 rounded-2xl border border-slate-800 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-royal" />
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-mutedslate bg-navy-800 rounded-2xl border border-slate-800 text-xs">
            No incidents found matching current filters.
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.incident_id}
              onClick={() => navigate(`/incidents/${inc.incident_id}`)}
              className="p-5 rounded-2xl bg-navy-800 border border-slate-800 hover:border-royal/60 transition cursor-pointer shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <SeverityBadge severity={inc.severity} size="sm" />
                  <StatusBadge status={inc.status} />
                  <span className="text-xs font-bold text-royal-200">{inc.incident_id}</span>
                  {inc.is_simulated && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                      SIMULATED DEMO
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-softwhite font-sans">{inc.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-mutedslate">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Users: {inc.affected_users.length > 0 ? inc.affected_users.join(', ') : 'None'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hosts: {inc.affected_hosts.length > 0 ? inc.affected_hosts.join(', ') : 'None'}</span>
                  </span>
                  <span>Events: <span className="text-softwhite font-bold">{inc.event_count}</span></span>
                  <span>Assigned: <span className="text-softwhite">{inc.assigned_analyst}</span></span>
                </div>
              </div>

              {/* Right Side: Risk Score & Action Indicator */}
              <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-navy-700/60">
                <div className="text-right">
                  <p className="text-[10px] text-mutedslate uppercase">Incident Risk</p>
                  <div className="text-xl font-bold font-mono">
                    <span className={inc.risk_score >= 80 ? 'text-soccritical' : inc.risk_score >= 60 ? 'text-socwarning' : 'text-socsuccess'}>
                      {inc.risk_score}
                    </span>
                    <span className="text-slate-500 text-xs">/100</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="px-3.5 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-royal text-xs font-semibold text-royal-200 flex items-center space-x-1.5 transition">
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
