import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Layers,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Download,
  PlusCircle,
  Radio,
  Server,
  FileCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react'

export function IngestionHealth() {
  const [models, setModels] = useState(null)
  const [error, setError] = useState('')
  const [pipeline, setPipeline] = useState(null)
  const [collectors, setCollectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [streamActive, setStreamActive] = useState(true)
  const [streamSpeed, setStreamSpeed] = useState(1)
  const [manualEvent, setManualEvent] = useState({
    event_type: 'network',
    source_ip: '192.168.1.105',
    destination_ip: '10.0.0.5',
    source_port: 54120,
    destination_port: 22,
    protocol: 'TCP',
    log_level: 'WARNING'
  })
  const [ingestStatus, setIngestStatus] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pipe, coll, model] = await Promise.all([
        api.getPipelineHealth(), api.getCollectorsHealth(), api.getModelHealth()
      ])
      setPipeline({ ...pipe, ...(pipe.queue || {}), avg_latency_ms: pipe.queue?.avg_detection_latency_ms })
      setCollectors(Array.isArray(coll) ? coll : (coll.collectors || []))
      setModels(model)
      setError('')
    } catch (err) {
      setError(`Health API unavailable: ${err.message}. Previously loaded measurements may be stale.`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleCollector = async (collId) => {
    try {
      await api.toggleCollector(collId)
      await fetchData()
    } catch (err) {
      console.error('Failed to toggle collector', err)
    }
  }

  const handleStreamControl = async (action) => {
    try {
      await api.controlDemoStream({ action, rate: streamSpeed })
      setStreamActive(action === 'resume')
    } catch (err) {
      console.error('Failed to control stream', err)
    }
  }

  const handleManualIngest = async (e) => {
    e.preventDefault()
    try {
      setIngestStatus('Ingesting...')
      await api.ingestEvent(manualEvent)
      setIngestStatus('Event successfully ingested and queued for evaluation!')
      setTimeout(() => setIngestStatus(null), 3500)
      await fetchData()
    } catch (err) {
      setIngestStatus(`Error: ${err.message}`)
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {models && <section className="rounded border border-slate-700 p-4 text-slate-300 text-sm"><h2 className="font-bold">Model and dataset readiness</h2><p>Anomaly baseline: {models.anomaly.baseline_source}</p><p>Supervised model: {models.supervised.status}</p><p>{models.anomaly.load_warning}</p><p>{Object.entries(models.datasets).map(([name, state]) => `${name}: ${state.available ? 'available' : 'missing'}`).join(' · ')}</p></section>}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-400" />
              <span>Telemetry Ingestion & Pipeline Health</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              RealtimeEventQueue Ring Buffer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Monitor real-time queue depth, manage packet & syslog collectors, and ingest synthetic or captured telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <a
            href="/api/events/export/csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d121c] border border-[#1e2736] text-xs font-medium text-slate-300 hover:text-white hover:border-purple-500/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Pipeline Metrics KPI */}
      {pipeline && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
            <span className="text-[10px] font-mono uppercase text-slate-400">Queue Depth / Max</span>
            <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
              {pipeline.queue_depth ?? 0} / {pipeline.queue_capacity ?? 'Unknown'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Asynchronous buffer depth</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
            <span className="text-[10px] font-mono uppercase text-slate-400">Processing Ingress Rate</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {pipeline.events_per_sec ?? 'Not measured'} eps
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Events processed / sec</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
            <span className="text-[10px] font-mono uppercase text-slate-400">Ingestion Latency</span>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
              {pipeline.avg_latency_ms ?? 'Not measured'} ms
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">SLA: $\le 100$ ms</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#0d121c] border border-[#1e2736]">
            <span className="text-[10px] font-mono uppercase text-slate-400">Dropped Events</span>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {pipeline.dropped_events || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Zero backpressure loss</div>
          </div>
        </div>
      )}

      {/* Ingestion Collectors Management */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <span>Active Telemetry Ingestion Collectors</span>
          </h2>
          <span className="text-xs font-mono text-emerald-400">4 Collectors Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {collectors.map((col) => (
            <div
              key={col.id}
              className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-purple-400 text-xs font-bold uppercase">{col.type}</span>
                  <Badge type={col.status === 'RUNNING' ? 'resolved' : 'block'}>{col.status}</Badge>
                </div>
                <h3 className="font-bold text-white text-xs">{col.name}</h3>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">
                  Captured: <span className="text-cyan-400 font-semibold">{col.events_captured || 0}</span> events
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#182130] flex justify-end">
                <button
                  onClick={() => handleToggleCollector(col.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                    col.status === 'RUNNING'
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/40'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40'
                  }`}
                >
                  {col.status === 'RUNNING' ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Single-Event Ingest Form */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-cyan-400" />
          <span>Manual Telemetry Payload Injector</span>
        </h2>

        {ingestStatus && (
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono text-purple-300">
            {ingestStatus}
          </div>
        )}

        <form onSubmit={handleManualIngest} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Event Type</label>
            <select
              value={manualEvent.event_type}
              onChange={(e) => setManualEvent({ ...manualEvent, event_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
            >
              <option value="network">network</option>
              <option value="auth">auth</option>
              <option value="endpoint">endpoint</option>
              <option value="dns">dns</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Source IP</label>
            <input
              type="text"
              value={manualEvent.source_ip}
              onChange={(e) => setManualEvent({ ...manualEvent, source_ip: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Destination IP</label>
            <input
              type="text"
              value={manualEvent.destination_ip}
              onChange={(e) => setManualEvent({ ...manualEvent, destination_ip: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Dest Port</label>
            <input
              type="number"
              value={manualEvent.destination_port}
              onChange={(e) => setManualEvent({ ...manualEvent, destination_port: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Log Level</label>
            <select
              value={manualEvent.log_level}
              onChange={(e) => setManualEvent({ ...manualEvent, log_level: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
            >
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" variant="primary" className="w-full">
              <span>Queue Event</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

