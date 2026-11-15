// Maps FastAPI backend incident models to Sentinel SOC workflow format
function formatTime(isoStr) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

export function mapBackendIncident(inc) {
  if (!inc) return null

  const sevRaw = (inc.severity || 'MEDIUM').toUpperCase()
  const sevMap = {
    CRITICAL: 'VERY HIGH',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  }
  const severity = sevMap[sevRaw] || sevRaw

  const riskScore = inc.risk_score ?? (severity === 'VERY HIGH' ? 88 : severity === 'HIGH' ? 76 : severity === 'MEDIUM' ? 52 : 20)

  // Extract source IP from affected_ips, raw field, or attack path DAG nodes
  let sourceIp = null
  if (Array.isArray(inc.affected_ips) && inc.affected_ips.length > 0) {
    sourceIp = inc.affected_ips[0]
  } else if (inc.source_ip) {
    sourceIp = inc.source_ip
  } else if (inc.attack_path_json?.nodes) {
    const srcNode = inc.attack_path_json.nodes.find(n => n.type === 'source_ip')
    if (srcNode) sourceIp = srcNode.label || srcNode.id?.replace('ip:', '')
  }
  if (!sourceIp) sourceIp = 'Internal / Unknown'

  // Extract target host or user
  let target = 'Monitored Asset'
  if (Array.isArray(inc.affected_hosts) && inc.affected_hosts.length > 0) {
    target = inc.affected_hosts.join(', ')
  } else if (inc.target) {
    target = inc.target
  } else if (Array.isArray(inc.affected_users) && inc.affected_users.length > 0) {
    target = `User: ${inc.affected_users.join(', ')}`
  }

  // Extract recommended actions from real response actions or AI summary
  let recommendedActions = []
  if (Array.isArray(inc.response_actions) && inc.response_actions.length > 0) {
    recommendedActions = inc.response_actions.map(a => a.description || a.action_type || a.title)
  } else if (Array.isArray(inc.ai_summary?.what_remediation_is_recommended) && inc.ai_summary.what_remediation_is_recommended.length > 0) {
    recommendedActions = inc.ai_summary.what_remediation_is_recommended
  } else if (Array.isArray(inc.ai_summary?.next_steps) && inc.ai_summary.next_steps.length > 0) {
    recommendedActions = inc.ai_summary.next_steps
  }

  // Response decision logic matching SOAR policies
  const recommendedDecision =
    severity === 'VERY HIGH' ? 'BLOCK' :
    severity === 'HIGH' ? 'INVESTIGATE' :
    severity === 'MEDIUM' ? 'MONITOR' : 'ALLOW'

  const relatedEventsCount = inc.event_count || inc.related_events?.length || 0
  const confidencePercent = Number.isFinite(inc.confidence) ? Math.round(inc.confidence * 100) : 85

  // Extract categories dynamically
  let categories = []
  if (Array.isArray(inc.categories) && inc.categories.length > 0) {
    categories = inc.categories
  } else if (Array.isArray(inc.participating_agents) && inc.participating_agents.length > 0) {
    categories = inc.participating_agents.map(a => a.replace(/Agent$/i, '').trim())
  } else {
    categories = ['Telemetry Ingest', 'Correlation']
  }

  // LLM reasoning from actual ai_summary (answers to 8 canonical questions)
  const llmObservation =
    inc.ai_summary?.what_happened ||
    inc.agent_analysis?.observation ||
    inc.description ||
    'Multi-agent investigation synthesized from telemetry correlation.'

  const llmConclusion =
    inc.ai_summary?.what_was_the_impact ||
    inc.ai_summary?.likely_attack_sequence ||
    inc.agent_analysis?.threat_hypothesis ||
    `${severity} incident assessed across ${relatedEventsCount} correlated event(s).`

  // Build authentic chronological timeline from actual incident milestones
  const timeline = []
  if (inc.first_seen) {
    timeline.push({
      time: formatTime(inc.first_seen),
      stage: 'Initial Signal Ingested',
      detail: `Telemetry stream flagged anomalous activity on target ${target}`,
      icon: '📥',
    })
  }

  if (Array.isArray(inc.ai_summary?.timeline_highlights) && inc.ai_summary.timeline_highlights.length > 0) {
    inc.ai_summary.timeline_highlights.slice(0, 3).forEach((hl) => {
      timeline.push({
        time: formatTime(inc.first_seen),
        stage: 'Telemetry Detail',
        detail: hl,
        icon: '🔍',
      })
    })
  }

  timeline.push({
    time: formatTime(inc.created_at),
    stage: 'Multi-Signal Correlated',
    detail: `Correlation Engine clustered ${relatedEventsCount} events (Confidence: ${confidencePercent}%)`,
    icon: '🔗',
  })

  if (inc.ai_summary?.generated_at || inc.investigation_status === 'COMPLETED') {
    timeline.push({
      time: formatTime(inc.ai_summary?.generated_at || inc.updated_at),
      stage: 'AI Investigation Completed',
      detail: `RCA synthesized answering 8 canonical SOC questions`,
      icon: '🧠',
    })
  }

  timeline.push({
    time: formatTime(inc.updated_at || inc.created_at),
    stage: 'Severity Classified',
    detail: `Classified as ${severity} (Risk Score: ${riskScore}/100)`,
    icon: '⚠️',
  })

  timeline.push({
    time: formatTime(inc.updated_at || inc.created_at),
    stage: 'SOAR Containment',
    detail: recommendedActions[0] || `Recommended Action: ${recommendedDecision} (Status: ${inc.response_status || 'READY'})`,
    icon: '⚡',
  })

  return {
    id: inc.incident_id || inc.id,
    title: inc.title || 'Correlated Security Threat Pattern',
    threatName: inc.threat_name || inc.title || 'Attack Sequence',
    severity,
    riskScore,
    sourceIp,
    target,
    relatedEventsCount,
    status: inc.status === 'NEW' ? 'Investigating' : inc.status || 'Active',
    assignedAnalyst: inc.assigned_analyst || 'Unassigned',
    detectedTime: formatTime(inc.created_at),
    correlationConfidence: confidencePercent,
    categories,
    llmObservation,
    llmConclusion,
    llmConfidence: confidencePercent,
    recommendedActions,
    recommendedDecision,
    timeline,
  }
}
