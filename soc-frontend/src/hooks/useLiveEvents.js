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
    timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Live',
    timeShort: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Live',
    type: (e.event_type || 'Security Telemetry').replace(/_/g, ' ').toUpperCase(),
    category,
    source: e.source_ip || e.host || 'Unknown Origin',
    destination: e.destination_ip ? `${e.destination_ip} (${e.host || 'Internal'})` : (e.host || 'Internal Asset'),
    networkInfo: e.protocol ? `${e.protocol} : ${e.destination_port || '—'}` : (e.command_line?.slice(0, 36) || '—'),
    authInfo: e.username ? `User: ${e.username} | ${e.command_line?.slice(0, 40) || 'Action recorded'}` : (e.command_line ? `Cmd: ${e.command_line.slice(0, 40)}` : 'System Telemetry'),
    status: e.detection_status === 'ANALYZED' ? 'Correlated' : 'New',
    correlationId: e.correlation_id || null,
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
        if (isMounted) {
          if (data?.events && Array.isArray(data.events)) {
            const mapped = data.events.map(mapBackendEvent)
            setEvents(mapped)
          } else {
            setEvents([])
          }
          setIsLiveConnected(true)
        }
      } catch (err) {
        console.warn('[LiveEvents] Backend telemetry unreachable:', err.message)
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

  // 3. Fallback Periodic Ingestion Simulation (only when explicitly toggled by user)
  useEffect(() => {
    if (!isSimulating || isLiveConnected) return

    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const newId = `EVT-${counterRef.current++}`

      const simulatedEvent = {
        id: newId,
        timestamp: `Live - ${timeStr}`,
        timeShort: timeStr,
        type: 'Simulated Probe',
        category: 'Network',
        source: '127.0.0.1',
        destination: 'Localhost',
        networkInfo: 'TCP : 80',
        authInfo: 'Simulation Stream',
        status: 'New',
        correlationId: null,
        llmStatus: 'Pending',
        severity: 'Low',
        action: 'ALLOW',
        isSimulated: true,
      }

      setEvents(prev => [simulatedEvent, ...prev].slice(0, 40))
      setLastAddedEvent(simulatedEvent)
      setFlashNew(true)
      setTimeout(() => setFlashNew(false), 2400)
    }, 8500)

    return () => clearInterval(interval)
  }, [isSimulating, isLiveConnected])

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
