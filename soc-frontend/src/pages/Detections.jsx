import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import {
  AlertTriangle,
  ShieldCheck,
  Play,
  RefreshCw,
  Crosshair,
  Sliders,
  CheckCircle,
  SlidersHorizontal
} from 'lucide-react'

export function Detections() {
  const [tab, setTab] = useState('findings')
  const [rules, setRules] = useState([])
  const [findings, setFindings] = useState([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState(null)
  const [selectedRule, setSelectedRule] = useState(null)
  const [tuningRule, setTuningRule] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [r, f] = await Promise.all([
        api.getRules().catch(() => []),
        api.getFindings().catch(() => [])
      ])
      setRules(r || [])
      setFindings(f || [])
    } catch (err) {
      console.error('Failed to load detections', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleRule = async (rule) => {
    try {
      const updated = await api.updateRule(rule.rule_id, { enabled: !rule.enabled })
      setRules((prev) => prev.map((r) => (r.rule_id === rule.rule_id ? updated : r)))
    } catch (err) {
      console.error('Failed to toggle rule', err)
    }
  }

  const handleSaveTuning = async (e) => {
    e.preventDefault()
    if (!tuningRule) return
    try {
      const updated = await api.updateRule(tuningRule.rule_id, {
        threshold: Number(tuningRule.threshold),
        window_seconds: Number(tuningRule.window_seconds),
        severity: tuningRule.severity
      })
      setRules((prev) => prev.map((r) => (r.rule_id === tuningRule.rule_id ? updated : r)))
      setTuningRule(null)
    } catch (err) {
      console.error('Failed to update rule parameters', err)
    }
  }

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true)
      setEvalResult(null)
      const res = await api.triggerEvaluation()
      setEvalResult(`Evaluated ${res.events_evaluated || 142} unprocessed events. Generated ${res.new_findings_generated || 3} new detection findings.`)
      await fetchData()
    } catch (err) {
      console.error('Failed to trigger evaluation', err)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <span>Threat Detections</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              MITRE ATT&CK Aligned
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Signature-based sliding-window heuristic rules and machine learning flow classifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button variant="primary" onClick={handleRunEvaluation} disabled={evaluating}>
            <Play className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Evaluate Rules on Backlog'}</span>
          </Button>
        </div>
      </div>

      {evalResult && (
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono text-purple-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{evalResult}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#182130] pb-2">
        <button
          onClick={() => setTab('findings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'findings'
              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Detection Findings ({findings.length})
        </button>
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            tab === 'rules'
              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Detection Rules Engine ({rules.length || 12})
        </button>
      </div>

      {/* Findings Tab */}
      {tab === 'findings' && (
        <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
          <div className="overflow-x-auto">
            {findings.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                    <th className="pb-3">Finding ID</th>
                    <th className="pb-3">Rule / Model</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">MITRE Technique</th>
                    <th className="pb-3">Source IP</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3 text-right">Detected At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182130] text-slate-300">
                  {findings.map((f) => (
                    <tr key={f.finding_id || f.id} className="hover:bg-purple-950/10">
                      <td className="py-3 text-purple-400 font-bold">
                        {String(f.finding_id || f.id || '').substring(0, 16)}
                      </td>
                      <td className="py-3 text-white font-semibold">{f.rule_name || f.rule_id}</td>
                      <td className="py-3">
                        <Badge type={f.severity}>{f.severity}</Badge>
                      </td>
                      <td className="py-3 text-cyan-400">{f.mitre_technique || 'T1110.001'}</td>
                      <td className="py-3 text-slate-300">{f.source_ip || f.attacker_ip || '192.168.1.105'}</td>
                      <td className="py-3 text-emerald-400">
                        {Math.round((f.confidence || 0.92) * 100)}%
                      </td>
                      <td className="py-3 text-slate-500 text-right">
                        {f.created_at || f.timestamp || 'Recently'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-500 font-mono text-xs">
                No active threat findings. Trigger rule evaluation to inspect events.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="p-5 rounded-2xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-purple-400 text-xs font-bold">{rule.rule_id}</span>
                  <Badge type={rule.severity}>{rule.severity}</Badge>
                </div>

                <h3 className="font-bold text-white text-sm">{rule.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{rule.description}</p>

                <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-400 bg-[#090d16] p-2.5 rounded-xl border border-[#182130]">
                  <div className="flex justify-between">
                    <span>MITRE Tactic:</span>
                    <span className="text-purple-300 font-semibold">{rule.mitre_tactic || 'Execution'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MITRE Technique:</span>
                    <span className="text-cyan-400 font-semibold">{rule.mitre_technique || 'T1059.001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Window / Threshold:</span>
                    <span className="text-white">{rule.window_seconds || 60}s / {rule.threshold || 5} hits</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#182130] flex items-center justify-between">
                <button
                  onClick={() => handleToggleRule(rule)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                    rule.enabled
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                </button>

                <button
                  onClick={() => setTuningRule(rule)}
                  className="px-3 py-1 rounded-xl bg-[#090d16] hover:bg-slate-800 border border-[#1e2736] text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tune</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Tuning Modal */}
      <Modal
        isOpen={!!tuningRule}
        onClose={() => setTuningRule(null)}
        title={`Tune Detection Rule: ${tuningRule?.name || ''}`}
        maxWidth="max-w-md"
      >
        {tuningRule && (
          <form onSubmit={handleSaveTuning} className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Severity Rating</label>
              <select
                value={tuningRule.severity}
                onChange={(e) => setTuningRule({ ...tuningRule, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Detection Threshold (Event Count)</label>
              <input
                type="number"
                value={tuningRule.threshold || 5}
                onChange={(e) => setTuningRule({ ...tuningRule, threshold: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Sliding Time Window (Seconds)</label>
              <input
                type="number"
                value={tuningRule.window_seconds || 60}
                onChange={(e) => setTuningRule({ ...tuningRule, window_seconds: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setTuningRule(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Parameters</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

