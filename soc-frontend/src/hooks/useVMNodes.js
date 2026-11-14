import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

export const isVMConnected = node => ['CONNECTED', 'RECEIVING_TELEMETRY'].includes(node.status)

export function useVMNodes() {
  const [nodes, setNodes] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const busy = useRef(false)
  const mounted = useRef(false)
  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const result = await api.getVMNodes()
      if (!Array.isArray(result.nodes)) throw new Error('Invalid VM status response')
      if (mounted.current) {
        setNodes(result.nodes.filter(node => ['vm-endpoint-01', 'vm-attacker-01'].includes(node.vm_id) || node.last_heartbeat_at))
        setError('')
      }
    } catch (err) {
      if (mounted.current) setError(err.message || 'Cannot reach VM status service')
    } finally {
      busy.current = false
      if (mounted.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    refresh()
    const interval = setInterval(() => { if (!document.hidden) refresh() }, 10000)
    return () => { mounted.current = false; clearInterval(interval) }
  }, [refresh])
  return { nodes, error, loading, refresh, connectedCount: nodes.filter(isVMConnected).length }
}
