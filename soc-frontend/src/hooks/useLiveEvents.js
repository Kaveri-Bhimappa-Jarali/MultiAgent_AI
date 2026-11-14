import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

function mapBackendEvent(e) {
  const sevMap = {
    CRITICAL: 'Very High',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
    INFO: 'Low',
  }

  const actionMap = {
    CRITICAL: 'BLOCK',
    HIGH: 'INVESTIGATE',
    MEDIUM: 'MONITOR',
    LOW: 'ALLOW',
    INFO: 'ALLOW',
  }

  const category =
    e.event_type === 'authentication' ? 'Authentication' :
    e.event_type === 'network_connection' ? 'Network' :
    e.event_type === 'process_execution' ? 'Endpoint' :
    e.event_type === 'web_attack' ? 'Web Attack' : 'Data Access'

  return {
    id: e.event_id || `EVT-${e.id}`,
    timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Nov 02, 2026 - Live',
    timeShort: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Live',
    type: (e.event_type || 'Security Telemetry').replace(/_/g, ' ').toUpperCase(),
    category,
    source: e.source_ip || e.host || '192.168.1.45',
    destination: e.destination_ip ? `${e.destination_ip} (${e.host || 'Internal'})` : e.host || 'Protected Subnet',
    networkInfo: e.protocol ? `${e.protocol} : ${e.destination_port || '443'}` : (e.command_line?.slice(0, 36) || 'TCP : 22 (SSH)'),
    authInfo: e.username ? `User: ${e.username} | ${e.command_line?.slice(0, 40) || 'Action verified'}` : 'System Agent Telemetry',
    status: e.detection_status === 'ANALYZED' ? 'Correlated' : 'New',
    correlationId: e.correlation_id || (e.severity === 'CRITICAL' || e.severity === 'HIGH' ? 'INC-2026-001' : null),
    llmStatus: e.detection_status === 'ANALYZED' ? 'Analyzed' : 'Pending',
    severity: sevMap[e.severity] || 'Medium',
    action: actionMap[e.severity] || 'MONITOR',
    isSimulated: !!e.is_simulated,
  }
}

export function useLiveEvents() {
  const [events, setEvents] = useState([])  // Start empty – real events loaded from backend
  const [isSimulating, setIsSimulating] = useState(false)
  const [lastAddedEvent, setLastAddedEvent] = useState(null)
  const [flashNew, setFlashNew] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const counterRef = useRef(1020)

  // 1. Initial fetch from FastAPI Backend
  useEffect(() => {
    let isMounted = true

    async function loadBackendEvents() {
      try {
        const data = await api.getEvents({ limit: 100 })
        if (isMounted && data?.events && data.events.length > 0) {
          const mapped = data.events.map(mapBackendEvent)
          setEvents(mapped)
          setIsLiveConnected(true)
        }
      } catch (err) {
        console.info('[LiveEvents] Running in self-contained simulation mode:', err.message)
      }
    }

    loadBackendEvents()

    // 2. WebSocket Real-time Broadcaster
    const ws = api.connectWebSocket(
      (msg) => {
        if (!isMounted) return
        setIsLiveConnected(true)

        if (msg && typeof msg === 'object') {
          if (msg.event || msg.type === 'NEW_EVENT' || msg.type === 'EVENT_INGESTED' || msg.event_id) {
            const raw = msg.type === 'EVENT_INGESTED' ? msg.data : (msg.event || msg)
            if (!raw?.event_id) return
            const mapped = mapBackendEvent(raw)
            setEvents(prev => [mapped, ...prev.filter(e => e.id !== mapped.id)].slice(0, 40))
            setLastAddedEvent(mapped)
            setFlashNew(true)
            setTimeout(() => setFlashNew(false), 2400)
          }
        }
      },
      () => setIsLiveConnected(true),
      () => setIsLiveConnected(false)
    )

    return () => {
      isMounted = false
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  // 3. Fallback Periodic Ingestion Simulation (only when backend is offline)
  useEffect(() => {
    if (!isSimulating || isLiveConnected) return

    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const newId = `EVT-${counterRef.current++}`

      const samples = [
        { type: 'Failed Login Velocity Spike', category: 'Authentication', source: '198.51.100.23', dest: 'VPN-GW-01', net: 'IPsec : 500', auth: 'User: vikram.sharma | 5 failures', sev: 'High', act: 'INVESTIGATE', corr: 'INC-2026-001' },
        { type: 'SQL Injection Pattern Blocked', category: 'Web Attack', source: '185.220.101.45', dest: 'API Gateway', net: 'HTTPS : 443', auth: 'WAF Rule: OWASP-942100', sev: 'Very High', act: 'BLOCK', corr: 'INC-2026-005' },
        { type: 'PowerShell Memory Injection', category: 'Endpoint', source: '10.0.1.15', dest: 'DB-FIN-01', net: 'Local IPC', auth: 'Proc: powershell.exe -enc ...', sev: 'Very High', act: 'BLOCK', corr: 'INC-2026-001' },
        { type: 'DNS Tunneling Beacon Detected', category: 'Network', source: '10.0.1.50', dest: 'WEB-PROD-01', net: 'UDP : 53', auth: 'High entropy queries', sev: 'Medium', act: 'MONITOR', corr: null },
      ]

      const chosen = samples[Math.floor(Math.random() * samples.length)]

      const simulatedEvent = {
        id: newId,
        timestamp: `Nov 02, 2026 - ${timeStr}`,
        timeShort: timeStr,
        type: chosen.type,
        category: chosen.category,
        source: chosen.source,
        destination: chosen.dest,
        networkInfo: chosen.net,
        authInfo: chosen.auth,
        status: chosen.corr ? 'Correlated' : 'New',
        correlationId: chosen.corr,
        llmStatus: chosen.corr ? 'Analyzed' : 'Pending',
        severity: chosen.sev,
        action: chosen.act,
        isSimulated: true,
      }

      setEvents(prev => [simulatedEvent, ...prev].slice(0, 40))
      setLastAddedEvent(simulatedEvent)
      setFlashNew(true)
      setTimeout(() => setFlashNew(false), 2400)
    }, 8500)

    return () => clearInterval(interval)
  }, [isSimulating])

  const toggleSimulation = () => setIsSimulating(prev => !prev)

  return {
    events,
    isSimulating,
    toggleSimulation,
    lastAddedEvent,
    flashNew,
    isLiveConnected,
  }
}
