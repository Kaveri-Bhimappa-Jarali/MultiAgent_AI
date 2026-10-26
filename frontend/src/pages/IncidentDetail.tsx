import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { IncidentDetail as DetailType, ResponseAction } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { AttackPathGraph } from '../components/attack_path/AttackPathGraph';
import {
  ShieldAlert,
  ArrowLeft,
  Download,
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  User,
  Laptop,
  Check,
  Send,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';

export const IncidentDetail: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<DetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchDetail = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      const res = await api.getIncidentDetail(incidentId);
      setIncident(res);
    } catch (err) {
      console.error('Failed to load incident detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [incidentId]);

  const handleRunInvestigation = async () => {
    if (!incidentId) return;
    try {
      setInvestigating(true);
      await api.triggerIncidentInvestigation(incidentId);
      await fetchDetail();
    } catch (err) {
      console.error('Failed to run investigation', err);
    } finally {
      setInvestigating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!incidentId) return;
    try {
      await api.updateIncidentStatus(incidentId, { status: newStatus });
      await fetchDetail();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !newNote.trim()) return;
    try {
      setAddingNote(true);
      await api.addIncidentNote(incidentId, newNote.trim());
      setNewNote('');
      await fetchDetail();
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      await api.approveResponse(actionId);
      await fetchDetail();
    } catch (err) {
      console.error('Failed to approve action', err);
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    try {
      await api.executeResponse(actionId, true);
      await fetchDetail();
    } catch (err) {
      console.error('Failed to execute action', err);
    }
  };

  const handleVerifyAction = async (actionId: string) => {
    try {
      await api.verifyResponse(actionId);
      await fetchDetail();
    } catch (err) {
      console.error('Failed to verify response', err);
    }
  };

  const handleDownloadPDF = () => {
    if (!incidentId) return;
    window.open(`/api/reports/incidents/${incidentId}/pdf`, '_blank');
  };

  if (loading && !incident) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-royal animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-12 text-center text-mutedslate">
        Incident not found.{' '}
        <button onClick={() => navigate('/incidents')} className="text-royal-300 underline">
          Return to Incidents
        </button>
      </div>
    );
  }

  const ai = incident.ai_summary;
  const risk = incident.risk_assessment;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-navy-700/80">
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center space-x-2 text-xs font-mono text-mutedslate hover:text-softwhite transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incidents</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunInvestigation}
            disabled={investigating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-royal/20 text-royal-200 border border-royal/40 hover:bg-royal/30 text-xs font-mono font-medium transition disabled:opacity-50"
          >
            <Bot className={`w-3.5 h-3.5 ${investigating ? 'animate-spin' : ''}`} />
            <span>{investigating ? 'Analyzing Telemetry...' : 'Run Multi-Agent RCA'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 text-xs font-mono font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Incident Dossier PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Incident Overview Header */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs px-2.5 py-0.5 rounded bg-navy-900 border border-slate-700 font-mono text-softwhite font-bold">
                {incident.incident_id}
              </span>
              <SeverityBadge severity={incident.severity} size="md" />
              <StatusBadge status={incident.status} />
              {incident.is_simulated && (
                <span className="text-xs px-2.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-mono font-semibold">
                  SIMULATED THREAT LAB
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-softwhite font-sans">{incident.title}</h1>
            <p className="text-xs text-mutedslate leading-relaxed font-sans">{incident.description}</p>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-mutedslate pt-2">
              <div>First Seen: <span className="text-softwhite">{new Date(incident.first_seen).toLocaleString()}</span></div>
              <div>Last Activity: <span className="text-softwhite">{new Date(incident.last_seen).toLocaleString()}</span></div>
              <div>Assigned Analyst: <span className="text-gold font-semibold">{incident.assigned_analyst}</span></div>
              <div>Telemetry Events: <span className="text-softwhite font-bold">{incident.event_count}</span></div>
            </div>
          </div>

          {/* Risk Gauge Card */}
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-700 flex flex-col items-center justify-center min-w-[160px]">
            <span className="text-[10px] text-mutedslate font-mono uppercase tracking-wider">Overall Risk Score</span>
            <div className="text-3xl font-bold font-mono my-1">
              <span className={incident.risk_score >= 80 ? 'text-soccritical' : incident.risk_score >= 60 ? 'text-socwarning' : 'text-socsuccess'}>
                {incident.risk_score}
              </span>
              <span className="text-slate-500 text-sm">/100</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-navy-800 text-royal-200 border border-royal/30 font-mono">
              {risk?.severity_band || incident.severity} SEVERITY
            </span>

            {/* Status Change Selector */}
            <div className="mt-3 pt-3 border-t border-slate-800 w-full">
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full bg-navy-800 border border-slate-700 rounded-lg p-1.5 text-[11px] font-mono text-softwhite focus:border-royal outline-none"
              >
                <option value="NEW">Status: NEW</option>
                <option value="INVESTIGATING">Status: INVESTIGATING</option>
                <option value="CONTAINED">Status: CONTAINED</option>
                <option value="RESOLVED">Status: RESOLVED</option>
                <option value="FALSE_POSITIVE">Status: FALSE POSITIVE</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Multi-Agent AI Investigation Summary (8-Question RCA) */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-royal/30 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-navy-700">
          <Bot className="w-5 h-5 text-royal-200" />
          <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono">
            Multi-Agent AI Root Cause Analysis (8-Question Investigation Framework)
          </h2>
        </div>

        {ai ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">1. What Happened?</span>
              <p className="text-slate-300 leading-relaxed font-sans">{ai.what_happened}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">2. How Did It Begin?</span>
              <p className="text-slate-300 leading-relaxed font-sans">{ai.how_did_it_begin}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">3. Targeted Systems & Accounts</span>
              <p className="text-slate-300 leading-relaxed font-sans">{ai.affected_systems_and_accounts}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">4. Observed Activities</span>
              <p className="text-slate-300 leading-relaxed font-sans">{ai.activities_occurred}</p>
            </div>
            <div className="md:col-span-2 p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">5. Likely Attack Sequence Progression</span>
              <p className="text-royal-200 font-bold leading-relaxed">{ai.likely_attack_sequence}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">6. Supporting Telemetry Evidence</span>
              <ul className="list-disc list-inside text-slate-300 space-y-1 font-sans">
                {ai.evidence_supporting && ai.evidence_supporting.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
              <span className="text-gold font-bold uppercase text-[11px]">7. Known Uncertainties & Blindspots</span>
              <ul className="list-disc list-inside text-slate-300 space-y-1 font-sans">
                {ai.uncertainties && ai.uncertainties.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs font-mono text-mutedslate bg-navy-900 rounded-xl">
            Investigation synthesis pending. Click "Run Multi-Agent RCA" to generate structured 8-question explanation.
          </div>
        )}
      </div>

      {/* 3. Attack-Path Topology Graph */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono flex items-center space-x-2">
          <Layers className="w-4 h-4 text-gold" />
          <span>Multi-Hop Attack Path Topology</span>
        </h2>
        <AttackPathGraph graph={incident.attack_path_json} />
      </div>

      {/* 4. Transparent Risk Scoring Breakdown */}
      {risk && (
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-navy-700">
            <TrendingUp className="w-5 h-5 text-socwarning" />
            <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono">
              Transparent Risk Assessment Engine Breakdown ({risk.overall_score}/100)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-mutedslate text-[10px]">Progression Stage</span>
              <p className="text-gold font-bold text-sm mt-0.5">{risk.progression_stage}</p>
            </div>
            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-mutedslate text-[10px]">Criticality Multiplier</span>
              <p className="text-softwhite font-bold text-sm mt-0.5">{risk.criticality_multiplier}x</p>
            </div>
            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-mutedslate text-[10px]">Severity Band</span>
              <p className="text-soccritical font-bold text-sm mt-0.5">{risk.severity_band}</p>
            </div>
            <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
              <span className="text-mutedslate text-[10px]">Telemetry Volume Bonus</span>
              <p className="text-royal-200 font-bold text-sm mt-0.5">+{risk.factors?.telemetry_volume_bonus || 0}</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-mono bg-navy-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-gold font-semibold">Risk Rationale: </span>
            {risk.explanation}
          </p>
        </div>
      )}

      {/* 5. SOAR Defensive Response & Containment Console */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-700">
          <div className="flex items-center space-x-2.5">
            <Zap className="w-5 h-5 text-gold" />
            <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono">
              SOAR Automated Defensive Response Console ({incident.response_actions.length} Actions)
            </h2>
          </div>
          <span className="text-xs text-mutedslate font-mono">Dry-Run Sandbox VPC Active</span>
        </div>

        {incident.response_actions.length === 0 ? (
          <p className="text-xs text-mutedslate font-mono py-4 text-center">
            No defensive actions formulated yet. Run Multi-Agent RCA or Response Agent.
          </p>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {incident.response_actions.map((act) => (
              <div
                key={act.action_id}
                className="p-4 rounded-xl bg-navy-900 border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-softwhite text-sm">{act.action_type}</span>
                    <span className="px-2 py-0.5 rounded bg-royal/20 text-royal-200 border border-royal/30">
                      Target: {act.target_value} ({act.target_type})
                    </span>
                    <StatusBadge status={act.status} />
                  </div>

                  <div className="flex items-center space-x-2">
                    {act.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => handleApproveAction(act.action_id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Action</span>
                      </button>
                    )}

                    {act.status === 'APPROVED' && (
                      <button
                        onClick={() => handleExecuteAction(act.action_id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-socsuccess border border-socsuccess/40 hover:bg-emerald-500/30 transition flex items-center space-x-1 font-bold"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Execute in Sandbox</span>
                      </button>
                    )}

                    {act.status === 'EXECUTED' && (
                      <button
                        onClick={() => handleVerifyAction(act.action_id)}
                        className="px-3 py-1.5 rounded-lg bg-royal/20 text-royal-200 border border-royal/40 hover:bg-royal/30 transition flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Run Response Verification</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-xs font-sans leading-relaxed">{act.reason}</p>

                {act.execution_result && (
                  <div className="p-3 rounded-lg bg-navy-950 border border-slate-800 text-[11px] space-y-1">
                    <div className="text-socsuccess font-semibold">Sandbox Execution Log:</div>
                    <div className="text-slate-300">{act.execution_result.effect}</div>
                    <div className="text-slate-500">Command: {act.execution_result.command_applied}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Response Verification Certificate */}
      {incident.verification_results.length > 0 && (
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-navy-700">
            <CheckCircle2 className="w-5 h-5 text-socsuccess" />
            <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono">
              Containment Response Verification Certificate
            </h2>
          </div>

          {incident.verification_results.map((ver) => (
            <div key={ver.verification_id} className="p-4 rounded-xl bg-navy-900 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-softwhite">Verification Audit ID: {ver.verification_id}</span>
                <StatusBadge status={ver.verification_status} />
              </div>
              <p className="text-slate-300 font-sans">{ver.evidence_summary}</p>
              <div className="text-[10px] text-mutedslate">
                Verified at: {new Date(ver.verified_at).toUTCString()} • Subsequent telemetry monitored: {ver.observed_events_count} events
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Chronological Event Timeline */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono flex items-center space-x-2">
          <Clock className="w-4 h-4 text-royal-200" />
          <span>Chronological Telemetry Event Sequence ({incident.events.length} Events)</span>
        </h2>

        <div className="space-y-3 font-mono text-xs">
          {incident.events.map((evt, idx) => (
            <div
              key={evt.event_id}
              className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 flex items-start space-x-3.5 hover:border-slate-700 transition"
            >
              <div className="w-6 h-6 rounded-full bg-navy-800 border border-royal/40 flex items-center justify-center text-royal-200 text-[10px] font-bold flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={evt.severity} size="sm" />
                    <span className="font-semibold text-softwhite uppercase">{evt.event_type}</span>
                    <span className="text-[10px] text-mutedslate">({evt.event_id})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 font-sans break-all">
                  {evt.command_line || evt.file_path || evt.file_action || 'Telemetry handshake recorded'}
                </p>
                <div className="text-[10px] text-mutedslate flex items-center space-x-3">
                  {evt.source_ip && <span>Source: {evt.source_ip}</span>}
                  {evt.host && <span>Host: {evt.host}</span>}
                  {evt.username && <span>User: {evt.username}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Analyst Notes & Incident Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-softwhite">Analyst Investigation Notes</h3>

          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add investigator observations, containment notes or MITRE references..."
              className="w-full bg-navy-900 border border-slate-700 rounded-xl p-3 text-xs text-softwhite placeholder-slate-500 font-mono focus:border-royal outline-none"
            />
            <button
              type="submit"
              disabled={addingNote || !newNote.trim()}
              className="px-4 py-2 rounded-xl bg-royal text-softwhite font-medium text-xs font-mono hover:bg-royal-600 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post Note</span>
            </button>
          </form>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 font-mono text-xs">
            {incident.notes.length === 0 ? (
              <p className="text-mutedslate text-center py-4">No notes recorded yet.</p>
            ) : (
              incident.notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-navy-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-mutedslate">
                    <span className="text-gold font-bold">{n.author}</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300 font-sans">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Trail */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-softwhite">Incident Audit Lifecycle</h3>
          <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
            {incident.audits.map((a, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-navy-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-royal-200 font-semibold">{a.action}</span>
                  <span className="text-mutedslate text-[10px]"> by {a.actor}</span>
                  {a.new_state && (
                    <div className="text-[10px] text-slate-400">
                      State: {a.previous_state || 'None'} → <span className="text-gold">{a.new_state}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
