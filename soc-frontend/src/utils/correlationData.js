const utcMilliseconds = value => {
  if (!value) return NaN
  const raw = String(value).trim().replace(' ', 'T')
  return Date.parse(/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(raw) ? raw : `${raw}Z`)
}

export function deriveCorrelationData(incident) {
  const events = [...new Map((incident?.events || []).filter(event => event?.event_id).map(event => [event.event_id, event])).values()]
    .sort((a, b) => {
      const left = utcMilliseconds(a.timestamp)
      const right = utcMilliseconds(b.timestamp)
      if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : a.event_id.localeCompare(b.event_id)
      if (!Number.isFinite(right)) return -1
      return left - right || a.event_id.localeCompare(b.event_id)
    })
  const times = events.map(event => utcMilliseconds(event.timestamp)).filter(Number.isFinite)
  return {
    events,
    sourceIPs: [...new Set(events.map(event => event.source_ip).filter(Boolean))],
    destinations: [...new Set(events.map(event => event.destination_ip).filter(Boolean))],
    eventTypes: [...new Set(events.map(event => event.event_type).filter(Boolean))],
    confidencePercent: Number.isFinite(incident?.confidence) ? Math.round(incident.confidence * 100) : null,
    firstSeen: times.length ? new Date(times[0]).toISOString() : null,
    lastSeen: times.length ? new Date(times[times.length - 1]).toISOString() : null,
    durationSeconds: times.length ? Math.round((times[times.length - 1] - times[0]) / 1000) : null,
  }
}
