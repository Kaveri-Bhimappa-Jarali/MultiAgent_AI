import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  FileText,
  Download,
  RefreshCw,
  Shield,
  Clock,
  Printer,
  Calendar,
  Layers
} from 'lucide-react'

export function Reports() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const list = await api.getIncidents({ limit: 10 }).catch(() => [])
      setIncidents(list || [])
    } catch (err) {
      console.error('Failed to load incidents for reporting', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-400" />
              <span>Executive SOC Reports & Compliance PDF Dossiers</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              ReportLab Generated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Generate and export publication-ready executive forensic dossiers and 24-hour security briefings
          </p>
        </div>

        <Button variant="secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* 24-Hour Executive Briefing Card */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-950/60 text-purple-300 border border-purple-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">24-Hour Executive Security Posture Briefing</h2>
              <span className="text-[11px] font-mono text-slate-400">Comprehensive Threat Landscape & KPI Summary</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Includes high-level executive narrative, MITRE ATT&CK coverage distribution, mean-time-to-detect (MTTD), mean-time-to-respond (MTTR), and summary of automated SOAR actions.
          </p>
        </div>

        <a
          href="/api/reports/summary/pdf"
          download="SOC_24H_Executive_Summary.pdf"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs font-mono shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download 24H Briefing PDF</span>
        </a>
      </div>

      {/* Incident Specific PDF Reports */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Incident Forensic PDF Dossiers</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Includes 8-Question Root Cause Analysis</span>
        </div>

        <div className="overflow-x-auto">
          {incidents.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                  <th className="pb-3">Incident ID</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">PDF Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {incidents.map((inc) => {
                  const id = inc.incident_id || inc.id
                  return (
                    <tr key={id} className="hover:bg-purple-950/10">
                      <td className="py-3 text-purple-400 font-bold">{String(id || '').substring(0, 16)}</td>
                      <td className="py-3 font-semibold text-white max-w-xs truncate">{inc.title}</td>
                      <td className="py-3">
                        <Badge type={inc.severity}>{inc.severity}</Badge>
                      </td>
                      <td className="py-3 text-cyan-400 font-bold">{inc.risk_score || 75}/100</td>
                      <td className="py-3">
                        <Badge type={inc.status}>{inc.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={`/api/reports/incidents/${id}/pdf`}
                          download={`Incident_${id}_Dossier.pdf`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#090d16] border border-[#1e2736] hover:border-purple-500/50 text-[11px] text-purple-300 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Dossier</span>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No incidents available to export. Once incidents are correlated, forensic PDF reports can be downloaded here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

