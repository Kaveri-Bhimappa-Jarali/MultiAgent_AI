import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ResponseAction, VerificationResult } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Zap, ShieldCheck, Check, RefreshCw, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Responses: React.FC = () => {
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [acts, vers] = await Promise.all([
        api.getResponses(statusFilter || undefined),
        api.getVerifications(),
      ]);
      setActions(acts);
      setVerifications(vers);
    } catch (err) {
      console.error('Failed to load SOAR responses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleApprove = async (actionId: string) => {
    try {
      await api.approveResponse(actionId);
      fetchData();
    } catch (err) {
      console.error('Failed to approve action', err);
    }
  };

  const handleExecute = async (actionId: string) => {
    try {
      await api.executeResponse(actionId, true);
      fetchData();
    } catch (err) {
      console.error('Failed to execute action', err);
    }
  };

  const handleVerify = async (actionId: string) => {
    try {
      await api.verifyResponse(actionId);
      fetchData();
    } catch (err) {
      console.error('Failed to verify response', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>SOAR DEFENSIVE RESPONSE & CONTAINMENT CONSOLE</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              POLICY CONTROLLED
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Human-in-the-loop authorization, sandbox dry-run execution and real-time response verification.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-700 pb-2 font-mono text-xs">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === '' ? 'bg-royal/20 text-softwhite border border-royal/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          All Actions ({actions.length})
        </button>
        <button
          onClick={() => setStatusFilter('PENDING_APPROVAL')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          Pending Approval
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'APPROVED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          Approved (Ready to Execute)
        </button>
        <button
          onClick={() => setStatusFilter('EXECUTED')}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === 'EXECUTED' ? 'bg-emerald-500/20 text-socsuccess border border-socsuccess/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          Executed
        </button>
      </div>

      {/* Response Actions Cards */}
      <div className="space-y-3 font-mono text-xs">
        {loading && actions.length === 0 ? (
          <div className="p-12 text-center text-mutedslate bg-navy-800 rounded-2xl border border-slate-800">
            Loading response actions...
          </div>
        ) : actions.length === 0 ? (
          <div className="p-12 text-center text-mutedslate bg-navy-800 rounded-2xl border border-slate-800">
            No response actions found in this filter state.
          </div>
        ) : (
          actions.map((act) => (
            <div
              key={act.action_id}
              className="p-5 rounded-2xl bg-navy-800 border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-softwhite text-sm">{act.action_type}</span>
                  <span className="px-2 py-0.5 rounded bg-royal/20 text-royal-200 border border-royal/30 font-semibold">
                    Target: {act.target_value} ({act.target_type})
                  </span>
                  <span
                    onClick={() => navigate(`/incidents/${act.incident_id}`)}
                    className="px-2 py-0.5 rounded bg-navy-900 border border-slate-700 text-gold hover:underline cursor-pointer"
                  >
                    Incident: {act.incident_id}
                  </span>
                  <StatusBadge status={act.status} />
                </div>

                <div className="flex items-center space-x-2">
                  {act.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => handleApprove(act.action_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center space-x-1.5 font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Action</span>
                    </button>
                  )}

                  {act.status === 'APPROVED' && (
                    <button
                      onClick={() => handleExecute(act.action_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-socsuccess border border-socsuccess/40 hover:bg-emerald-500/30 transition flex items-center space-x-1.5 font-bold shadow-md shadow-emerald-950/40"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Execute in Sandbox</span>
                    </button>
                  )}

                  {act.status === 'EXECUTED' && (
                    <button
                      onClick={() => handleVerify(act.action_id)}
                      className="px-3.5 py-1.5 rounded-xl bg-royal/20 text-royal-200 border border-royal/40 hover:bg-royal/30 transition flex items-center space-x-1.5 font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Containment</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-slate-300 font-sans leading-relaxed">{act.reason}</p>
              <p className="text-mutedslate text-[11px] font-sans">
                <span className="text-gold font-semibold">Expected Impact: </span>
                {act.expected_effect}
              </p>

              {act.execution_result && (
                <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 text-[11px] space-y-1">
                  <div className="text-socsuccess font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sandbox VPC Containment Executed</span>
                  </div>
                  <div className="text-slate-300">{act.execution_result.effect}</div>
                  <div className="text-slate-500">Command Executed: {act.execution_result.command_applied}</div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Response Verification Audit History */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-navy-700">
          <ShieldCheck className="w-5 h-5 text-socsuccess" />
          <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider font-mono">
            Mandatory Response Verification Telemetry Log
          </h2>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {verifications.length === 0 ? (
            <p className="text-mutedslate text-center py-4">No response verification runs completed yet.</p>
          ) : (
            verifications.map((v) => (
              <div
                key={v.verification_id}
                className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-softwhite">{v.verification_id}</span>
                    <span className="text-mutedslate">(Action: {v.action_id} • Incident: {v.incident_id})</span>
                  </div>
                  <p className="text-slate-300 font-sans mt-1">{v.evidence_summary}</p>
                </div>
                <StatusBadge status={v.verification_status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
