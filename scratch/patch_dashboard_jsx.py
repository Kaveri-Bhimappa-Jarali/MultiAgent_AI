path = 'soc-frontend/src/pages/Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        // All incidents: total count
        const incidentList = Array.isArray(allIncidents) ? allIncidents : []
        const totalIncidents = incidentList.length

        // Correlated events = number of incidents (each incident = correlation cluster)
        const correlatedCount = totalIncidents

        // Active threats = open (non-contained) incidents
        const openCount = m.open_incidents ?? incidentList.filter(i => i.status !== 'CONTAINED').length

        // Critical incidents = HIGH or CRITICAL severity
        const critCount = m.critical_high_incidents ?? incidentList.filter(i => ['CRITICAL','HIGH'].includes(i.severity)).length

        // AI Analyses = findings from Investigation + Correlation agents
        const aiCount = Array.isArray(agentStatuses)
          ? agentStatuses
              .filter(a => ['Investigation Agent','Correlation Agent','Attack-Path Analysis Agent'].some(n => a.name?.includes(n.split(' ')[0])))
              .reduce((sum, a) => sum + (a.total_findings || 0), 0)
          : totalFindings

        const totalEvents = m.total_events ?? 0

        setMetrics({
          eventsReceived:    { value: totalEvents.toLocaleString(),  label: 'Events Received',    sub: 'Real-time security feed',          trend: '',                  color: '#8b5cf6' },
          correlatedEvents:  { value: correlatedCount.toString(),     label: 'Correlated Events',  sub: 'Correlation Engine Active',         trend: `${totalIncidents} Incidents`, color: '#06b6d4' },
          activeThreats:     { value: openCount.toString(),           label: 'Active Threats',     sub: `${critCount} High Risk`,           trend: '',                  color: '#f97316' },
          criticalIncidents: { value: critCount.toString(),           label: 'Critical Incidents', sub: 'Needs Immediate Attention',         trend: `${m.contained_threats ?? 0} Contained`, color: '#ef4444' },
          aiAnalyses:        { value: aiCount.toString(),             label: 'AI Analyses',        sub: 'Multi-Agent Pipeline',             trend: 'Live',              color: '#d946ef' },
          overallRiskScore: Math.round(m.avg_risk_score || (critCount > 0 ? 70 : 30)),
        })'''

replacement = '''        // All incidents & explicit correlation metrics
        const incidentList = Array.isArray(allIncidents) ? allIncidents : []
        const uniqueIncidents = m.unique_correlated_incidents ?? incidentList.length
        const correlationMatches = m.correlation_matches ?? incidentList.filter(i => Boolean(i.correlation_reasons && i.correlation_reasons.length)).length
        const openCount = m.active_incidents ?? incidentList.filter(i => i.status !== 'CONTAINED' && i.status !== 'RESOLVED').length
        const critCount = m.critical_high_incidents ?? incidentList.filter(i => ['CRITICAL','HIGH'].includes(i.severity)).length

        // AI Analyses = findings from Investigation + Correlation agents
        const aiCount = Array.isArray(agentStatuses)
          ? agentStatuses
              .filter(a => ['Investigation Agent','Correlation Agent','Attack-Path Analysis Agent'].some(n => a.name?.includes(n.split(' ')[0])))
              .reduce((sum, a) => sum + (a.total_findings || 0), 0)
          : totalFindings

        const totalEvents = m.total_events ?? 0

        setMetrics({
          eventsReceived:    { value: totalEvents.toLocaleString(),  label: 'Events Received',       sub: 'Real-time security feed',          trend: '',                  color: '#8b5cf6' },
          correlatedEvents:  { value: uniqueIncidents.toString(),    label: 'Correlated Incidents',  sub: `${correlationMatches} Verified Clusters`, trend: `${openCount} Active`, color: '#06b6d4' },
          activeThreats:     { value: openCount.toString(),          label: 'Active Threats',        sub: `${critCount} High Risk`,           trend: '',                  color: '#f97316' },
          criticalIncidents: { value: critCount.toString(),          label: 'Critical Incidents',    sub: 'Needs Immediate Attention',         trend: `${m.contained_threats ?? 0} Contained`, color: '#ef4444' },
          aiAnalyses:        { value: aiCount.toString(),            label: 'AI Analyses',           sub: 'Multi-Agent Pipeline',             trend: 'Live',              color: '#d946ef' },
          overallRiskScore: Math.round(m.avg_risk_score || (critCount > 0 ? 70 : 30)),
        })'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated Dashboard.jsx metrics')
else:
    print('Target not found in Dashboard.jsx')
