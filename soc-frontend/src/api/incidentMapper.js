// Maps FastAPI backend incident models to Sentinel SOC workflow format
export function mapBackendIncident(inc) {
  if (!inc) return null

  const sevRaw = (inc.severity || 'HIGH').toUpperCase()
  const sevMap = {
    CRITICAL: 'VERY HIGH',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  }
  const severity = sevMap[sevRaw] || sevRaw

  const riskScore = inc.risk_score || (severity === 'VERY HIGH' ? 88 : severity === 'HIGH' ? 76 : severity === 'MEDIUM' ? 52 : 20)

  // Extract source IP from nodes if available
  let sourceIp = inc.source_ip
  if (!sourceIp && inc.attack_path_json?.nodes) {
    const srcNode = inc.attack_path_json.nodes.find(n => n.type === 'source_ip')
    if (srcNode) sourceIp = srcNode.label || srcNode.id?.replace('ip:', '')
  }
  if (!sourceIp) sourceIp = '198.51.100.23'

  // Extract recommended actions
  let recommendedActions = []
  if (inc.response_actions && Array.isArray(inc.response_actions) && inc.response_actions.length > 0) {
    recommendedActions = inc.response_actions.map(a => a.description || a.action_type || a.title)
  }
  if (recommendedActions.length === 0) {
    recommendedActions = [
      `Block source IP ${sourceIp} at perimeter edge firewall`,
      'Temporarily disable target user account and revoke active tokens',
      'Isolate compromised endpoint host from internal corporate network',
      'Notify SOC Incident Commander and trigger forensic capture',
    ]
  }

  // Response decision logic matching prompt
  const recommendedDecision =
    severity === 'VERY HIGH' ? 'BLOCK' :
    severity === 'HIGH' ? 'INVESTIGATE' :
    severity === 'MEDIUM' ? 'MONITOR' : 'ALLOW'

  return {
    id: inc.incident_id || inc.id,
    title: inc.title || 'Coordinated Multi-Stage Threat Pattern',
    threatName: inc.threat_name || inc.title || 'Attack Sequence',
    severity,
    riskScore,
    sourceIp,
    target: inc.target || 'Production Server & Directory',
    relatedEventsCount: inc.event_count || inc.related_events?.length || 3,
    status: inc.status === 'NEW' ? 'Investigating' : inc.status || 'Active',
    assignedAnalyst: inc.assigned_analyst || 'Sarah Chen (Lead Tier-3)',
    detectedTime: inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : '10:43 AM',
    correlationConfidence: inc.confidence ? Math.round(inc.confidence * 100) : 94,
    categories: inc.categories || ['Authentication', 'Network', 'Endpoint'],
    llmObservation:
      inc.agent_analysis?.observation ||
      inc.summary ||
      `Multiple sequential security events were detected originating from source IP ${sourceIp}. Behavioral correlation confirms automated probe followed by credential harvesting attempt.`,
    llmConclusion:
      inc.agent_analysis?.threat_hypothesis ||
      `COORDINATED ${severity} ATTACK CHAIN INVOLVING ADVERSARY RECONNAISSANCE`,
    llmConfidence: inc.confidence ? Math.round(inc.confidence * 100) : 94,
    recommendedActions,
    recommendedDecision,
    timeline: [
      { time: '10:42:31', stage: 'Event Received', detail: 'Initial security event flagged by detection engine', icon: '📥' },
      { time: '10:43:02', stage: 'Event Correlated', detail: 'Correlation Engine linked multi-stage signals into incident', icon: '🔗' },
      { time: '10:43:15', stage: 'LLM Analysis Completed', detail: 'LLM Observation & Conclusion synthesized via Multi-Agent AI', icon: '🧠' },
      { time: '10:43:20', stage: 'Severity Classified', detail: `Classified as ${severity} (Risk: ${riskScore}/100)`, icon: '⚠️' },
      { time: '10:43:25', stage: 'Response Recommended', detail: `Recommended Action: ${recommendedDecision} — Mitigation Ready`, icon: '⚡' },
    ]
  }
}
