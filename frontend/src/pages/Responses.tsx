import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ResponseAction, VerificationResult } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Zap,
  ShieldCheck,
  Check,
  RefreshCw,
  CheckCircle2,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatSocTimestamp } from '../utils/timestamps.js';

const SIMULATABLE_ACTIONS: Record<string, string> = {
  BLOCK_IP: 'Would add a firewall deny rule for the specified IP address.',
  ISOLATE_ENDPOINT: 'Would restrict the specified endpoint to its SOC management channel.',
  DISABLE_USER: 'Would disable sign-in for the specified identity.',
};

const RESPONSE_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SIMULATED', label: 'Simulated' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'EXECUTED', label: 'Executed' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'FAILED', label: 'Failed' },
];

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unexpected SOAR response error';

export const Responses: React.FC = () => {
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSocAdmin = user?.role === 'SOC Admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [acts, vers] = await Promise.all([
        api.getResponses(statusFilter || undefined),
        api.getVerifications(),
      ]);
      setActions(acts);
      setVerifications(vers);
    } catch (err) {
      setError(`Unable to load SOAR responses: ${errorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [statusFilter]);

  const performAction = async (
    actionId: string,
    operation: 'approve' | 'simulate' | 'execute' | 'verify',
  ) => {
    try {
      setBusyAction(actionId);
      setError(null);
      if (operation === 'approve') await api.approveResponse(actionId);
      if (operation === 'simulate') await api.simulateResponse(actionId);
      if (operation === 'execute') await api.executeResponse(actionId, false);
      if (operation === 'verify') await api.verifyResponse(actionId);
      await fetchData();
    } catch (err) {
      setError(`Unable to ${operation} response action: ${errorMessage(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>SOAR DEFENSIVE RESPONSE &amp; CONTAINMENT CONSOLE</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              POLICY CONTROLLED
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Review the proposed effect and run a no-change simulation before administrator approval or lab dispatch.
          </p>
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-sans">
          <AlertTriangle className="inline w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-navy-700 pb-2 font-mono text-xs">
        {RESPONSE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === filter.value
                ? 'bg-royal/20 text-softwhite border border-royal/40 font-bold'
                : 'text-mutedslate hover:text-softwhite'
            }`}
          >
            {filter.label}{filter.value === '' ? ` (${actions.length})` : ''}
          </button>
        ))}
      </div>

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
          actions.map((act) => {
            const canSimulate = Boolean(SIMULATABLE_ACTIONS[act.action_type])
              && ['RECOMMENDED', 'PENDING_APPROVAL', 'APPROVED', 'SIMULATED'].includes(act.status);
            const canApprove = isSocAdmin
              && ['RECOMMENDED', 'PENDING_APPROVAL', 'SIMULATED'].includes(act.status);
            const canExecute = isSocAdmin && act.status === 'APPROVED';
            const canVerify = isSocAdmin
              && ['EXECUTED', 'PENDING_VERIFICATION'].includes(act.status);

            return (
              <div
                key={act.action_id}
                className="p-5 rounded-2xl bg-navy-800 border border-slate-800 hover:border-slate-700 transition shadow-xl space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-softwhite text-sm">{act.action_type}</span>
                    <StatusBadge status={act.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canSimulate && (
                      <button
                        onClick={() => void performAction(act.action_id, 'simulate')}
                        disabled={busyAction !== null}
                        className="px-3.5 py-1.5 rounded-xl bg-violet-500/20 text-violet-200 border border-violet-400/40 hover:bg-violet-500/30 transition flex items-center space-x-1.5 font-bold disabled:opacity-50"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Dry Run / Simulate</span>
                      </button>
                    )}
                    {canApprove && (
                      <button
                        onClick={() => void performAction(act.action_id, 'approve')}
                        disabled={busyAction !== null}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center space-x-1.5 font-bold disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Action</span>
                      </button>
                    )}
                    {canExecute && (
                      <button
                        onClick={() => void performAction(act.action_id, 'execute')}
                        disabled={busyAction !== null}
                        title="Admin-only: dispatches to a matching registered lab guest and may execute a real command there."
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-socsuccess border border-socsuccess/40 hover:bg-emerald-500/30 transition flex items-center space-x-1.5 font-bold disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Dispatch to Lab Guest</span>
                      </button>
                    )}
                    {canVerify && (
                      <button
                        onClick={() => void performAction(act.action_id, 'verify')}
                        disabled={busyAction !== null}
                        className="px-3.5 py-1.5 rounded-xl bg-royal/20 text-royal-200 border border-royal/40 hover:bg-royal/30 transition flex items-center space-x-1.5 font-bold disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify Response</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                  <div className="rounded-lg bg-navy-900 p-3 text-slate-300">
                    <div className="text-mutedslate uppercase">Target</div>
                    <div className="mt-1 break-all">{act.target_value} ({act.target_type})</div>
                  </div>
                  <button
                    onClick={() => navigate(`/incidents/${act.incident_id}`)}
                    className="rounded-lg bg-navy-900 p-3 text-left text-gold hover:underline"
                  >
                    <div className="text-mutedslate uppercase">Associated Incident</div>
                    <div className="mt-1 break-all">{act.incident_id}</div>
                  </button>
                  <div className="rounded-lg bg-navy-900 p-3 text-slate-300 sm:col-span-2">
                    <div className="text-mutedslate uppercase">Proposed Action</div>
                    <div className="mt-1">{SIMULATABLE_ACTIONS[act.action_type] || act.expected_effect}</div>
                  </div>
                  <div className="rounded-lg bg-navy-900 p-3 text-slate-300 sm:col-span-2">
                    <div className="text-gold uppercase">Expected Result</div>
                    <div className="mt-1">{act.expected_effect}</div>
                  </div>
                </div>
                <p className="text-slate-300 font-sans leading-relaxed">{act.reason}</p>

                <div className="flex flex-wrap items-center gap-x-2 rounded-lg border border-violet-400/20 bg-violet-500/5 p-3 text-[11px]">
                  <span className="text-violet-200 font-semibold">Simulation status:</span>
                  <StatusBadge status={act.execution_result?.simulation_status || 'NOT_RUN'} />
                  <span className="text-mutedslate">
                    {act.execution_result?.actual_system_changes === false
                      ? 'No real firewall, endpoint, or identity-system changes were made.'
                      : 'Simulation has not been run.'}
                  </span>
                </div>

                {act.execution_result?.is_simulation && (
                  <div className="p-3.5 rounded-xl bg-navy-950 border border-violet-400/30 text-[11px] space-y-1">
                    <div className="text-violet-200 font-semibold flex items-center space-x-1.5">
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Simulation only — no actual containment</span>
                    </div>
                    <div className="text-slate-300">{act.execution_result.proposed_action}</div>
                    <div className="text-slate-400">Expected result: {act.execution_result.expected_result}</div>
                    <div className="text-mutedslate">Simulated by {act.execution_result.simulated_by || 'registered lab guest'} at {act.execution_result.simulated_at ? formatSocTimestamp(act.execution_result.simulated_at) : 'reported execution time'}.</div>
                  </div>
                )}

                {canExecute && (
                  <p className="text-amber-200/90 text-[11px]">
                    Real dispatch is separate from simulation. It is sent only to a matching registered lab guest;
                    a guest acknowledgement is not proof of containment.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

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
            verifications.map((verification) => (
              <div
                key={verification.verification_id}
                className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-softwhite">{verification.verification_id}</span>
                    <span className="text-mutedslate">
                      (Action: {verification.action_id} • Incident: {verification.incident_id})
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans mt-1">{verification.evidence_summary}</p>
                  <div className="mt-2 space-y-1 text-[10px] text-mutedslate">
                    {verification.checks_performed.map((check, index) => (
                      <div key={`${verification.verification_id}-${index}`}>
                        {check.passed ? 'PASS' : 'NOT CONFIRMED'} — {check.check}
                        {check.evidence_source ? ` (${check.evidence_source})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
                <StatusBadge status={verification.verification_status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
