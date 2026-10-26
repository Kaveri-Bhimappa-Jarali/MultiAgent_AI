import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Settings as SettingsIcon, Shield, Sliders, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const [policies, setPolicies] = useState<Record<string, any>>({
    auto_containment_threshold: 85,
    require_human_approval: true,
    dry_run_default: true,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [savedMessage, setSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPolicies(), api.getAuditLogs(30)])
      .then(([p, logs]) => {
        setPolicies(p);
        setAuditLogs(logs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updatePolicies(policies);
      setPolicies(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Failed to update policies', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
          <span>GOVERNANCE POLICIES & AUDIT LOGS</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
            SECURITY & COMPLIANCE
          </span>
        </h1>
        <p className="text-xs text-mutedslate mt-1 font-mono">
          Configure automated containment thresholds, dry-run safety modes, and inspect immutable system audit records.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-socsuccess/40 text-xs font-mono text-socsuccess flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Policies successfully synchronized with the backend security engine.</span>
        </div>
      )}

      {/* Policies Form */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-navy-700">
          <Sliders className="w-5 h-5 text-gold" />
          <h3 className="text-sm font-semibold text-softwhite font-mono">SOAR Containment Governance Policies</h3>
        </div>

        <form onSubmit={handleSavePolicies} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-mutedslate mb-1">
                  Automatic Containment Risk Threshold: <span className="text-gold font-bold">{policies.auto_containment_threshold} / 100</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={policies.auto_containment_threshold}
                  onChange={(e) => setPolicies({ ...policies, auto_containment_threshold: parseInt(e.target.value) })}
                  className="w-full accent-royal cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  Incidents reaching or exceeding this risk score trigger high-priority containment recommendations.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-900 border border-slate-800">
                <div>
                  <span className="text-softwhite font-semibold">Require Human Authorization</span>
                  <p className="text-[11px] text-slate-500 font-sans">Enforces human-in-the-loop review before executing response actions.</p>
                </div>
                <input
                  type="checkbox"
                  checked={policies.require_human_approval}
                  onChange={(e) => setPolicies({ ...policies, require_human_approval: e.target.checked })}
                  className="w-4 h-4 accent-royal cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-navy-900 border border-slate-800">
                <div>
                  <span className="text-softwhite font-semibold">Dry-Run Mode Default</span>
                  <p className="text-[11px] text-slate-500 font-sans">Executes containment inside simulated VPC sandbox by default.</p>
                </div>
                <input
                  type="checkbox"
                  checked={policies.dry_run_default}
                  onChange={(e) => setPolicies({ ...policies, dry_run_default: e.target.checked })}
                  className="w-4 h-4 accent-royal cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 text-[11px] text-slate-400 font-sans">
                <span className="text-royal-200 font-semibold font-mono">Isolated Testing Guarantee: </span>
                Containment actions (firewall block, account disable, host isolation) execute exclusively against safe test VPC targets without modifying production networks.
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25"
          >
            Save Policy Configurations
          </button>
        </form>
      </div>

      {/* Immutable Audit Logs Table */}
      <div className="bg-navy-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
        <div className="p-4 bg-navy-950/70 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-softwhite flex items-center space-x-2">
            <Shield className="w-4 h-4 text-royal-200" />
            <span>Immutable Security Operations Audit Trail</span>
          </h3>
          <span className="text-[10px] text-mutedslate">{auditLogs.length} recent audit records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-navy-950/80 border-b border-navy-700 text-mutedslate uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type & ID</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 text-softwhite">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-navy-700/40 transition">
                  <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-gold">{log.actor}</td>
                  <td className="py-3 px-4 text-royal-200">{log.action}</td>
                  <td className="py-3 px-4 text-slate-300">
                    {log.target_type ? `${log.target_type}: ${log.target_id || ''}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/15 text-socsuccess' : 'bg-red-500/15 text-soccritical'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
