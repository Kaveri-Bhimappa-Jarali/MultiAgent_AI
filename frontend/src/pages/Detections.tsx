import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DetectionRule, DetectionFinding } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { AlertTriangle, ShieldCheck, Play, RefreshCw, CheckCircle, Crosshair } from 'lucide-react';

export const Detections: React.FC = () => {
  const [tab, setTab] = useState<'rules' | 'findings'>('rules');
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [findings, setFindings] = useState<DetectionFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [r, f] = await Promise.all([
        api.getRules(),
        api.getFindings(),
      ]);
      setRules(r);
      setFindings(f);
    } catch (err) {
      console.error('Failed to load detections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (rule: DetectionRule) => {
    try {
      const updated = await api.updateRule(rule.rule_id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.rule_id === rule.rule_id ? updated : r)));
    } catch (err) {
      console.error('Failed to toggle rule', err);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      setEvalResult(null);
      const res = await api.triggerEvaluation();
      setEvalResult(`Evaluated ${res.events_evaluated} unprocessed events. Generated ${res.new_findings_generated} new detection findings.`);
      fetchData();
    } catch (err) {
      console.error('Failed to trigger evaluation', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>THREAT DETECTION ENGINE & RULE MANAGER</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              MITRE ATT&CK ALIGNED
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Manage deterministic behavioral signatures, ML anomaly thresholds and inspect active detection findings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Evaluate Rules on Backlog'}</span>
          </button>
        </div>
      </div>

      {evalResult && (
        <div className="p-3.5 rounded-xl bg-royal/15 border border-royal/40 text-xs font-mono text-royal-100 flex items-center space-x-2.5">
          <CheckCircle className="w-4 h-4 text-royal-300 flex-shrink-0" />
          <span>{evalResult}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-navy-700 pb-2">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition ${
            tab === 'rules'
              ? 'bg-royal/20 text-softwhite border border-royal/40'
              : 'text-mutedslate hover:text-softwhite hover:bg-navy-800'
          }`}
        >
          Detection Rules ({rules.length})
        </button>
        <button
          onClick={() => setTab('findings')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition ${
            tab === 'findings'
              ? 'bg-royal/20 text-softwhite border border-royal/40'
              : 'text-mutedslate hover:text-softwhite hover:bg-navy-800'
          }`}
        >
          Detection Findings ({findings.length})
        </button>
      </div>

      {/* Tab: Detection Rules */}
      {tab === 'rules' && (
        <div className="bg-navy-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-navy-950/80 border-b border-navy-700 text-mutedslate uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rule ID & Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">MITRE Technique</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/60 text-softwhite">
                {rules.map((rule) => (
                  <tr key={rule.rule_id} className="hover:bg-navy-700/40 transition">
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold text-softwhite flex items-center space-x-2">
                        <span>{rule.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-900 text-slate-400 border border-slate-700">
                          {rule.rule_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-mutedslate mt-1 line-clamp-2">{rule.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-navy-900 border border-slate-700 text-slate-300">
                        {rule.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={rule.severity} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      {rule.mitre_technique ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">
                          {rule.mitre_technique}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {rule.threshold} ev / {rule.time_window_seconds}s
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                          rule.enabled
                            ? 'bg-socsuccess/15 border-socsuccess text-socsuccess hover:bg-socsuccess/25'
                            : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700/50'
                        }`}
                      >
                        {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Detection Findings */}
      {tab === 'findings' && (
        <div className="space-y-3 font-mono text-xs">
          {findings.length === 0 ? (
            <div className="p-12 text-center text-mutedslate bg-navy-800 rounded-2xl border border-slate-800">
              No detection findings recorded yet. Run evaluation or launch a Demo scenario.
            </div>
          ) : (
            findings.map((f) => (
              <div
                key={f.finding_id}
                className="p-4 rounded-xl bg-navy-800 border border-slate-800 hover:border-slate-700 transition space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={f.severity} size="sm" />
                    <span className="font-semibold text-softwhite text-sm">{f.rule_name}</span>
                    <span className="text-[10px] text-mutedslate">({f.finding_id})</span>
                  </div>
                  <span className="text-gold font-bold">
                    Confidence: {Math.round(f.confidence * 100)}%
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{f.explanation}</p>

                {f.next_step && (
                  <div className="p-2.5 rounded-lg bg-navy-900 border border-slate-700/60 text-royal-200">
                    <span className="text-mutedslate">Recommended Action: </span>
                    {f.next_step}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
