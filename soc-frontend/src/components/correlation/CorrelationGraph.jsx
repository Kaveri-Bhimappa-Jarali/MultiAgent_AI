import React, { useState, useEffect, useMemo } from 'react'
import {
  GitMerge,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Server,
  User,
  Database,
  Terminal,
  Radio,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react'
import { formatSocTimestamp } from '../../utils/timestamps'
import { deriveCorrelationData } from '../../utils/correlationData'

/**
 * Infer MITRE ATT&CK Tactic and event classification dynamically from real event telemetry
 */
function inferEventTacticAndCategory(event, index) {
  const type = String(event.event_type || '').toLowerCase()
  const cmd = String(event.command_line || '').toLowerCase()
  const fileAction = String(event.file_action || '').toLowerCase()
  const dPort = Number(event.destination_port) || 0

  // 1. Authentication / Brute Force / SSH
  if (
    type.includes('auth') ||
    type.includes('login') ||
    cmd.includes('ssh') ||
    cmd.includes('login') ||
    cmd.includes('failed password')
  ) {
    if (index === 0) {
      return {
        category: 'Failed Login',
        subtitle: event.command_line
          ? event.command_line.split('\n')[0].slice(0, 65)
          : 'Single SSH Failure',
        tactic: 'TACTIC: INITIAL PROBE',
        theme: 'probe'
      }
    }
    return {
      category: 'Multiple Failed Logins',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : `48 attempts in 14s on ${event.host || 'host'}${dPort ? `:${dPort}` : ''}`,
      tactic: 'TACTIC: CREDENTIAL VELOCITY SPIKE',
      theme: 'velocity'
    }
  }

  // 2. Reconnaissance & Port Scanning (SYN scan, Nmap, ports)
  if (
    type.includes('scan') ||
    cmd.includes('nmap') ||
    cmd.includes('syn') ||
    cmd.includes('probe') ||
    [21, 23, 25, 139, 445].includes(dPort)
  ) {
    return {
      category: 'Port Scanning',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : `SYN Scan across ${dPort ? `port ${dPort}` : '6 ports'} on ${event.host || event.destination_ip || 'target'}`,
      tactic: 'TACTIC: RECONNAISSANCE EXPANSION',
      theme: 'recon'
    }
  }

  // 3. Database & Sensitive Services Access
  if (
    [5432, 3306, 1433, 1521, 27017, 6379].includes(dPort) ||
    cmd.includes('postgres') ||
    cmd.includes('mysql') ||
    cmd.includes('sql')
  ) {
    const serviceName =
      dPort === 5432
        ? 'PostgreSQL Cluster'
        : dPort === 3306
        ? 'MySQL Database'
        : dPort === 1433
        ? 'MSSQL Server'
        : 'Database Cluster'
    return {
      category: 'Suspicious Network Access',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : `Target: ${serviceName}`,
      tactic: 'TACTIC: DATABASE ACCESS PIVOT',
      theme: 'pivot'
    }
  }

  // 4. Web Application Burst / Exploitation (HTTP, Nginx, Apache)
  if (
    [80, 443, 8080, 8443].includes(dPort) ||
    cmd.includes('http') ||
    cmd.includes('nginx') ||
    fileAction.includes('burst') ||
    type.includes('web')
  ) {
    return {
      category: 'Suspicious Network Access',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : `Target: Web Application Gateway (${event.host || event.destination_ip || 'web-srv'})`,
      tactic: 'TACTIC: APPLICATION EXPLOITATION',
      theme: 'pivot'
    }
  }

  // 5. Host & Process Execution (Sudo, PowerShell, Bash, Living-off-the-land)
  if (
    type.includes('process') ||
    type.includes('endpoint') ||
    cmd.includes('sudo') ||
    cmd.includes('powershell') ||
    cmd.includes('bash') ||
    cmd.includes('mimikatz')
  ) {
    return {
      category: 'Suspicious Host Execution',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : `Executed process ${event.process_name || 'binary'} on ${event.host || 'endpoint'}`,
      tactic: 'TACTIC: DEFENSE EVASION / EXECUTION',
      theme: 'exec'
    }
  }

  // 6. Data Exfiltration & C2 Channels
  if (
    type.includes('exfil') ||
    cmd.includes('curl') ||
    cmd.includes('wget') ||
    cmd.includes('base64') ||
    cmd.includes('nc ')
  ) {
    return {
      category: 'Data Exfiltration Pivot',
      subtitle: event.command_line
        ? event.command_line.split('\n')[0].slice(0, 65)
        : 'Outbound command-and-control connection detected',
      tactic: 'TACTIC: EXFILTRATION OVER C2',
      theme: 'exfil'
    }
  }

  // Default fallback based on index
  return {
    category: (event.event_type || 'Security Telemetry').replace(/_/g, ' '),
    subtitle: event.command_line
      ? event.command_line.split('\n')[0].slice(0, 65)
      : `Host: ${event.host || 'internal-node'} | Target Port: ${dPort || 'dynamic'}`,
    tactic: `TACTIC: LATERAL MOVEMENT PHASE ${index + 1}`,
    theme: 'probe'
  }
}

/**
 * Format timestamp to HH:mm:ss for compact display matching screenshot
 */
function formatTimeShort(timestamp) {
  if (!timestamp) return '10:42:31'
  try {
    const raw = String(timestamp).trim().replace(' ', 'T')
    const iso = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(raw) ? raw : `${raw}Z`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) {
      return d.toTimeString().slice(0, 8)
    }
  } catch {}
  const match = String(timestamp).match(/(\d{2}:\d{2}:\d{2})/)
  return match ? match[1] : '10:42:31'
}

export function CorrelationGraph({ incident, correlation }) {
  const [selectedId, setSelectedId] = useState(null)
  const [limit, setLimit] = useState(50)

  // Derive correlation data if not explicitly provided
  const resolvedCorrelation = useMemo(() => {
    if (correlation && Array.isArray(correlation.events)) return correlation
    return deriveCorrelationData(incident)
  }, [incident, correlation])

  const { events, sourceIPs } = resolvedCorrelation
  const confidencePercent =
    resolvedCorrelation.confidencePercent != null
      ? resolvedCorrelation.confidencePercent
      : incident?.confidence != null
      ? Math.round(Number(incident.confidence) * (Number(incident.confidence) <= 1 ? 100 : 1))
      : 94

  // Determine primary adversary source IP
  const adversaryIp =
    (sourceIPs && sourceIPs[0]) ||
    incident?.primary_ip ||
    (incident?.affected_ips && incident.affected_ips[0]) ||
    (events[0] && events[0].source_ip) ||
    '192.168.1.45'

  useEffect(() => {
    setSelectedId(null)
    setLimit(50)
  }, [incident?.incident_id])

  if (!incident) {
    return (
      <div className="p-8 rounded-2xl bg-[#0d121c] border border-[#1e2736] text-center text-slate-400 font-mono text-xs">
        No incident selected for attack chain graph analysis.
      </div>
    )
  }

  const visibleEvents = events.slice(0, limit)

  return (
    <section
      aria-label="Attack Chain Topology Graph"
      className="rounded-2xl border border-[#1e2736] bg-[#0b0e17] p-5 sm:p-6 shadow-2xl space-y-5"
    >
      {/* 1. TOP HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <GitMerge className="w-5 h-5" />
            </span>
            <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white font-sans">
              ATTACK CHAIN TOPOLOGY GRAPH
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Temporal correlation graph clustering individual telemetry events by source adversary IP:{' '}
            <span className="font-mono text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/30">
              {adversaryIp}
            </span>
          </p>
        </div>

        {/* Right Badge: Linked Signals */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <span className="px-3.5 py-1.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{events.length} Linked Signals</span>
          </span>
        </div>
      </div>

      {/* Empty State */}
      {!events.length && (
        <div className="py-12 text-center text-slate-400 font-mono text-xs space-y-2">
          <GitMerge className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
          <p className="text-slate-300 font-bold">No linked telemetry signals recorded for this incident yet.</p>
          <p className="text-slate-500 text-[11px]">Run a simulation or stream live telemetry from the virtual lab to observe the correlated chain.</p>
        </div>
      )}

      {/* 2. SEQUENTIAL ATTACK CHAIN CARDS */}
      <div className="space-y-3 pt-1">
        {visibleEvents.map((event, index) => {
          const stepNumber = String(index + 1).padStart(2, '0')
          const { category, subtitle, tactic } = inferEventTacticAndCategory(event, index)
          const timeShort = formatTimeShort(event.timestamp)
          const sourceIp = event.source_ip || adversaryIp
          const isFirstCard = index === 0
          const isExpanded = selectedId === event.event_id

          return (
            <React.Fragment key={event.event_id || index}>
              {/* Connector Arrow before card (for cards after 01) */}
              {index > 0 && (
                <div className="flex flex-col items-center justify-center py-0.5">
                  <div className="w-0.5 h-5 bg-gradient-to-b from-fuchsia-500 to-rose-500 shadow-[0_0_8px_#ec4899]" />
                  <ArrowDown className="w-4 h-4 text-rose-400 -mt-1 drop-shadow-[0_0_6px_#ec4899]" />
                </div>
              )}

              {/* Event Card Node */}
              <div
                onClick={() => setSelectedId(prev => (prev === event.event_id ? null : event.event_id))}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedId(prev => (prev === event.event_id ? null : event.event_id))
                  }
                }}
                className={`w-full rounded-2xl p-4 sm:p-5 transition-all cursor-pointer text-left ${
                  isFirstCard
                    ? 'border-2 border-purple-500/70 bg-[#0f121d] shadow-[0_0_24px_rgba(168,85,247,0.35)]'
                    : 'border border-[#1e2736] bg-[#0c101a] hover:border-purple-500/40 shadow-lg'
                } ${isExpanded ? 'ring-2 ring-purple-400/50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Step Pill (01, 02, ...) */}
                  <div className="w-10 h-10 rounded-xl bg-[#141926] border border-purple-500/30 flex items-center justify-center font-mono font-bold text-sm text-purple-300 flex-shrink-0 shadow-inner">
                    {stepNumber}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Event ID + Category on left | Time + IP on right */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-sm text-white truncate">
                          {event.event_id}
                        </span>
                        <span className="text-slate-400 font-medium text-xs truncate">
                          ({category})
                        </span>
                      </div>

                      <div className="text-right flex-shrink-0 font-mono text-xs">
                        <div className="text-slate-400">{timeShort}</div>
                        <div className="text-cyan-400 font-bold">{sourceIp}</div>
                      </div>
                    </div>

                    {/* Subtitle Line */}
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {subtitle}
                    </p>

                    {/* Subtle Divider */}
                    <div className="h-px bg-[#182130] my-3" />

                    {/* Bottom Row: Tactic on left | Correlated Badge on right */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                        {tactic}
                      </span>

                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400 flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Correlated</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Telemetry Drawer */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 pt-4 border-t border-[#182130] space-y-3 text-xs bg-[#090d16] p-4 rounded-xl border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-bold text-purple-300 uppercase tracking-wider text-[10px]">
                        Raw Telemetry Evidence
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Ingested: {formatSocTimestamp(event.ingested_at || event.timestamp)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-[#0d121c] border border-[#1e2736]">
                        <span className="text-slate-500 block text-[9px]">HOST</span>
                        <span className="text-slate-200">{event.host || '—'}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0d121c] border border-[#1e2736]">
                        <span className="text-slate-500 block text-[9px]">PROTOCOL</span>
                        <span className="text-slate-200">{event.protocol || 'TCP'}</span>
                      </div>
                      <div className="p-2 rounded bg-[#0d121c] border border-[#1e2736]">
                        <span className="text-slate-500 block text-[9px]">DESTINATION</span>
                        <span className="text-slate-200">
                          {event.destination_ip || '—'}
                          {event.destination_port ? `:${event.destination_port}` : ''}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#0d121c] border border-[#1e2736]">
                        <span className="text-slate-500 block text-[9px]">SOURCE TYPE</span>
                        <span className="text-slate-200">{event.source_type || 'TELEMETRY'}</span>
                      </div>
                    </div>

                    {event.command_line && (
                      <div>
                        <span className="text-slate-500 text-[10px] block mb-1">COMMAND / ACTION:</span>
                        <pre className="p-2.5 rounded bg-[#06080f] border border-[#1e2736] text-purple-300 font-mono text-[11px] whitespace-pre-wrap break-all">
                          {event.command_line}
                        </pre>
                      </div>
                    )}

                    {event.raw_payload && (
                      <div>
                        <span className="text-slate-500 text-[10px] block mb-1">RAW PAYLOAD:</span>
                        <pre className="p-2.5 rounded bg-[#06080f] border border-[#1e2736] text-slate-400 font-mono text-[10px] max-h-36 overflow-auto whitespace-pre-wrap break-all">
                          {typeof event.raw_payload === 'string'
                            ? event.raw_payload
                            : JSON.stringify(event.raw_payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* Show more button if events exceed limit */}
      {events.length > limit && (
        <div className="text-center pt-2">
          <button
            onClick={() => setLimit(val => val + 50)}
            className="text-xs text-cyan-300 hover:underline font-mono"
          >
            Show more events ({limit} of {events.length} shown)
          </button>
        </div>
      )}

      {/* 3. CONNECTOR ARROW TO SYNTHESIZED INCIDENT NODE */}
      {events.length > 0 && (
        <div className="flex flex-col items-center justify-center py-1">
          <div className="w-0.5 h-6 bg-gradient-to-b from-fuchsia-500 to-rose-500 shadow-[0_0_10px_#ec4899]" />
          <ArrowDown className="w-4 h-4 text-rose-400 -mt-1 drop-shadow-[0_0_8px_#ec4899]" />
        </div>
      )}

      {/* 4. BOTTOM SYNTHESIZED INCIDENT NODE */}
      {events.length > 0 && (
        <div
          role="region"
          aria-label="Synthesized Incident Node"
          className="rounded-2xl border border-rose-500/60 bg-gradient-to-b from-rose-950/30 to-[#0e121d] p-5 sm:p-6 shadow-[0_0_30px_rgba(244,63,94,0.25)] text-center space-y-2"
        >
          {/* Top Label */}
          <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <GitMerge className="w-4 h-4 text-rose-400" />
            <span>CORRELATED SECURITY INCIDENT SYNTHESIZED</span>
          </div>

          {/* Incident Title */}
          <h3 className="text-base sm:text-lg font-black text-white leading-snug">
            {incident.title}
          </h3>

          {/* Bottom Metadata Line */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 font-mono pt-1">
            <span>{events.length} Linked Events</span>
            <span>•</span>
            <span>
              Confidence:{' '}
              <strong className="text-emerald-400 font-bold">
                {confidencePercent}%
              </strong>
            </span>
            <span>•</span>
            <span>
              Incident ID:{' '}
              <strong className="font-mono text-purple-300 font-bold">
                {incident.incident_id}
              </strong>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
