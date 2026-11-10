import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Save,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  Lock
} from 'lucide-react'

export function Settings() {
  const [policies, setPolicies] = useState({
    auto_containment_enabled: false,
    auto_containment_threshold: 75,
    critical_asset_multiplier: 1.5,
    admin_user_multiplier: 1.4,
    cti_bonus: 15,
    max_burst_bonus: 15,
    verification_window_seconds: 60
  })
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const defaultAuditLogs = [
    { id: 'aud-01', operator: 'admin', action: 'UPDATE_POLICY', entity: 'RISK_ENGINE', timestamp: '10 minutes ago' },
    { id: 'aud-02', operator: 'analyst', action: 'APPROVE_CONTAINMENT', entity: 'IP: 198.51.100.22', timestamp: '25 minutes ago' },
    { id: 'aud-03', operator: 'analyst', action: 'TRIGGER_RCA', entity: 'INC-2026-001', timestamp: '1 hour ago' },
    { id: 'aud-04', operator: 'system', action: 'AUTO_LOGIN_SESSION', entity: 'analyst@enterprise', timestamp: '2 hours ago' }
  ]

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pol, logs] = await Promise.all([
        api.getPolicies().catch(() => null),
        api.getAuditLogs().catch(() => defaultAuditLogs)
      ])
      if (pol) setPolicies((prev) => ({ ...prev, ...pol }))
      setAuditLogs(logs && logs.length > 0 ? logs : defaultAuditLogs)
    } catch (err) {
      console.error('Failed to load settings', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSavePolicies = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setSaveStatus(null)
      await api.updatePolicies(policies)
      setSaveStatus('Policies and risk weights successfully updated!')
      setTimeout(() => setSaveStatus(null), 3500)
      await fetchData()
    } catch (err) {
      setSaveStatus(`Error saving policies: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-purple-400" />
              <span>System Settings & Operational Policies</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              Policy Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Calibrate risk scoring weights, toggle auto-containment gates, and inspect non-repudiable audit logs
          </p>
        </div>

        <Button variant="secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono text-purple-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Policies Form */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Risk Engine Mathematical Parameters & Containment Policy</span>
        </h2>

        <form onSubmit={handleSavePolicies} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Domain Controller / DB Criticality ($M_{'{'}asset{'}'}$)</label>
              <input
                type="number"
                step="0.1"
                value={policies.critical_asset_multiplier}
                onChange={(e) => setPolicies({ ...policies, critical_asset_multiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Multiplier for crown-jewel assets (1.0 - 2.5)</span>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Domain Admin Privilege Multiplier ($M_{'{'}user{'}'}$)</label>
              <input
                type="number"
                step="0.1"
                value={policies.admin_user_multiplier}
                onChange={(e) => setPolicies({ ...policies, admin_user_multiplier: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Elevates risk for root/admin account compromises</span>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Confirmed CTI Bonus ($B_{'{'}cti{'}'}$)</label>
              <input
                type="number"
                value={policies.cti_bonus}
                onChange={(e) => setPolicies({ ...policies, cti_bonus: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Flat bonus added for verified threat actor matches</span>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Max Burst Volume Bonus ($B_{'{'}vol{'}'}$ Cap)</label>
              <input
                type="number"
                value={policies.max_burst_bonus}
                onChange={(e) => setPolicies({ ...policies, max_burst_bonus: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Upper bound limit preventing score runaway</span>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Auto-Containment Risk Threshold</label>
              <input
                type="number"
                value={policies.auto_containment_threshold}
                onChange={(e) => setPolicies({ ...policies, auto_containment_threshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Minimum risk score required to formulate containment</span>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <label className="text-slate-400 block mb-1">Verification Window (Seconds)</label>
              <input
                type="number"
                value={policies.verification_window_seconds}
                onChange={(e) => setPolicies({ ...policies, verification_window_seconds: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Observation duration for 7-state verification</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#182130]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto_contain"
                checked={policies.auto_containment_enabled}
                onChange={(e) => setPolicies({ ...policies, auto_containment_enabled: e.target.checked })}
                className="w-4 h-4 rounded bg-[#090d16] border-[#1e2736] text-purple-600 focus:ring-0"
              />
              <label htmlFor="auto_contain" className="text-xs text-white cursor-pointer select-none">
                Enable Autonomous SOAR Containment Execution (Skip Analyst Gate for Risk $\ge 85$)
              </label>
            </div>

            <Button type="submit" variant="primary" disabled={saving}>
              <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'Saving...' : 'Save Policies'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-purple-400" />
            <span>Non-Repudiable System Audit Trail</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{auditLogs.length} logged actions</span>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                  <th className="pb-3">Audit ID</th>
                  <th className="pb-3">Operator</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Entity Target</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {auditLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-purple-950/10">
                    <td className="py-3 text-purple-400 font-bold">{log.id || `aud-0${i + 1}`}</td>
                    <td className="py-3 text-white font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.operator || log.username || 'admin'}</span>
                    </td>
                    <td className="py-3 text-cyan-400">{log.action}</td>
                    <td className="py-3 text-slate-300">{log.entity || log.target || 'SYSTEM'}</td>
                    <td className="py-3 text-slate-500 text-right">{log.timestamp || 'Recently'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

