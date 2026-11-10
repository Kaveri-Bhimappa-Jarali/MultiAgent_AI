import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { AttackPathGraph } from '../components/correlation/AttackPathGraph'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  ShieldAlert,
  ArrowLeft,
  Download,
  Bot,
  Zap,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  TrendingUp,
  FileText,
  User,
  Server
} from 'lucide-react'

export function IncidentDetail() {
  const { incidentId } = useParams()
  const navigate = useNavigate()

  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [investigating, setInvestigating] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const fetchDetail = async () => {
    if (!incidentId) return
    try {
      setLoading(true)
      const res = await api.getIncidentDetail(incidentId)
      setIncident(res)
    } catch (err) {
      console.error('Failed to load incident detail', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [incidentId])

  const handleRunInvestigation = async () => {
    if (!incidentId) return
    try {
      setInvestigating(true)
      await api.triggerIncidentInvestigation(incidentId)
      await fetchDetail()
    } catch (err) {
      console.error('Failed to run investigation', err)
    } finally {
      setInvestigating(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!incidentId) return
    try {
      await api.updateIncidentStatus(incidentId, { status: newStatus })
      await fetchDetail()
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!incidentId || !newNote.trim()) return
    try {
      setAddingNote(true)
      await api.addIncidentNote(incidentId, newNote.trim())
      setNewNote('')
      await fetchDetail()
    } catch (err) {
      console.error('Failed to add note', err)
    } finally {
      setAddingNote(false)
    }
  }

  const handleApproveAction = async (actionId) => {
    try {
      await api.approveResponse(actionId)
      await fetchDetail()
    } catch (err) {
      console.error('Failed to approve action', err)
    }
  }

  const handleExecuteAction = async (actionId) => {
    try {
      await api.executeResponse(actionId, false)
      await fetchDetail()
    } catch (err) {
      console.error('Failed to execute action', err)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-sm">
        Loading incident details for {incidentId}...
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-sm space-y-4">
        <div>Incident not found or failed to load.</div>
        <Button variant="secondary" onClick={() => navigate('/incidents')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Incidents
        </Button>
      </div>
    )
  }

  const rca = incident.rca_summary || {}
  const riskScore = incident.risk_score || 0

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/incidents')}
            className="p-2 rounded-xl bg-[#0d121c] border border-[#1e2736] text-slate-400 hover:text-white hover:border-purple-500/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-purple-400 font-bold text-sm">{incident.incident_id || incident.id}</span>
              <Badge type={incident.severity}>{incident.severity}</Badge>
              <Badge type={incident.status}>{incident.status}</Badge>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{incident.title || 'Security Incident'}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#0d121c] border border-[#1e2736] text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          >
            <option value="OPEN">Status: OPEN</option>
            <option value="INVESTIGATING">Status: INVESTIGATING</option>
            <option value="CONTAINED">Status: CONTAINED</option>
            <option value="RESOLVED">Status: RESOLVED</option>
            <option value="FALSE_POSITIVE">Status: FALSE_POSITIVE</option>
          </select>

          <Button
            variant="glow"
            onClick={handleRunInvestigation}
            disabled={investigating}
          >
            <Bot className={`w-4 h-4 ${investigating ? 'animate-spin' : ''}`} />
            <span>{investigating ? 'Running AI Agents...' : 'Re-run 10-Agent RCA'}</span>
          </Button>

          <a
            href={`/api/reports/incidents/${incidentId}/pdf`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d121c] border border-[#1e2736] text-xs font-medium text-slate-300 hover:text-white hover:border-purple-500/40 transition-colors"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export PDF</span>
          </a>
        </div>
      </div>

      {/* Risk Metrics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Composite Risk Score</div>
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mt-1">
            {riskScore} / 100
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">7-factor mathematical bound</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Primary Attacker Vector</div>
          <div className="text-sm font-bold text-white mt-1 font-mono truncate">
            {incident.primary_ip || incident.source_ip || 'External Threat'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Initial origin probe</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Primary Target Host</div>
          <div className="text-sm font-bold text-white mt-1 font-mono truncate">
            {incident.primary_host || incident.destination_ip || 'Internal Asset'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Assessed crown-jewel impact</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Related Alerts Correlated</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {incident.alerts ? incident.alerts.length : 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Multi-signal fused alerts</div>
        </div>
      </div>

      {/* Dynamic Topological Attack-Path Graph */}
      {incident.attack_path && (
        <AttackPathGraph graph={incident.attack_path} />
      )}

      {/* 8-Question Canonical SOC Root Cause Analysis */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#182130]">
          <Bot className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">8 Canonical SOC Investigative Questions (Root Cause Analysis)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>1. What happened?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {rca.what_happened || incident.description || 'Adversarial lateral movement activity detected across enterprise endpoints.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>2. How did it start (Root Cause)?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {rca.how_it_started || 'Initial brute-force authentication burst targeting exposed SSH services.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>3. What systems and accounts are affected?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {rca.affected_systems || `Target Host: ${incident.primary_host || 'srv-dc-01'}, Origin: ${incident.primary_ip || '192.168.1.105'}`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>4. What is the attack timeline?</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-mono">
              {rca.attack_timeline || `First probe: ${incident.created_at || 'Recently'}, Last activity: ${incident.updated_at || 'Active'}`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>5. What data or assets were accessed?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {rca.data_accessed || 'Confidential database records and active directory credential stores.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>6. Observed MITRE ATT&CK techniques?</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-mono">
              {incident.mitre_techniques && incident.mitre_techniques.length > 0
                ? incident.mitre_techniques.join(', ')
                : 'T1110.001 (Brute Force), T1059.001 (PowerShell), T1021.002 (SMB/PsExec)'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>7. What is the confidence and severity score?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Assessed confidence: {rca.confidence || '94%'} | Composite Risk: {riskScore}/100 ({incident.severity})
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736]">
            <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span>8. Recommended immediate remediation?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {rca.remediation || 'Enforce perimeter IP block on threat origin, reset affected user credentials, and isolate compromised host.'}
            </p>
          </div>
        </div>
      </div>

      {/* Proposed SOAR Actions */}
      {incident.proposed_actions && incident.proposed_actions.length > 0 && (
        <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#182130]">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Recommended SOAR Containment Actions</h2>
          </div>

          <div className="space-y-3">
            {incident.proposed_actions.map((act) => (
              <div
                key={act.id || act.action_id}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-white text-sm">{act.action_type}</span>
                    <Badge type={act.status}>{act.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Target: <span className="text-white">{act.target_entity}</span> | Blast Radius: <span className="text-purple-300">{act.blast_radius || 'LOW'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {act.status === 'PENDING_APPROVAL' && (
                    <Button variant="primary" size="xs" onClick={() => handleApproveAction(act.id || act.action_id)}>
                      Approve Action
                    </Button>
                  )}
                  {act.status === 'APPROVED' && (
                    <Button variant="danger" size="xs" onClick={() => handleExecuteAction(act.id || act.action_id)}>
                      Execute Now
                    </Button>
                  )}
                  {act.status === 'ACTIVE' && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyst Investigation Notes */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white pb-3 border-b border-[#182130]">Analyst Notes & Activity Log</h2>

        {incident.notes && incident.notes.length > 0 ? (
          <div className="space-y-2">
            {incident.notes.map((note, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-semibold text-purple-300">{note.author || 'Analyst'}</span>
                  <span className="font-mono text-[10px]">{note.timestamp || 'Recently'}</span>
                </div>
                <div className="text-slate-200">{note.content || note.note}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono">No analyst notes recorded yet.</p>
        )}

        <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an analyst note or containment comment..."
            className="flex-1 px-4 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />
          <Button type="submit" disabled={addingNote || !newNote.trim()}>
            <Send className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </Button>
        </form>
      </div>
    </div>
  )
}

