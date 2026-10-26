import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Activity,
  Radio,
  Server,
  Cpu,
  Clock,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  Wifi,
  WifiOff,
  Flame
} from 'lucide-react';

export const IngestionHealth: React.FC = () => {
  const { status: wsStatus, lastEventTime, lastProcessedTime, subscribe } = useWebSocket();
  const [pipelineData, setPipelineData] = useState<any | null>(null);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const [pip, col] = await Promise.all([
        api.getPipelineHealth(),
        api.getCollectorsHealth()
      ]);
      setPipelineData(pip);
      setCollectors(col.collectors || []);
      setWarnings(col.freshness_warnings || []);
    } catch (err) {
      console.error('Failed to fetch health data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to live WebSocket events to refresh stats immediately
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', () => fetchHealth());
    const unsub2 = subscribe('EVENT_PROCESSED', () => fetchHealth());
    const unsub3 = subscribe('COLLECTOR_STATUS_CHANGED', (data) => {
      if (Array.isArray(data)) setCollectors(data);
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe]);

  const handleToggleCollector = async (collectorId: string) => {
    try {
      setToggling(collectorId);
      await api.toggleCollector(collectorId);
      await fetchHealth();
    } catch (err) {
      console.error(`Failed to toggle collector ${collectorId}`, err);
    } finally {
      setToggling(null);
    }
  };

  const queue = pipelineData?.queue || {
    queue_depth: 0,
    total_enqueued: 0,
    total_processed: 0,
    total_failed: 0,
    events_received_per_minute: 0,
    events_processed_per_minute: 0,
    avg_detection_latency_ms: 0,
    avg_incident_latency_ms: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>REAL-TIME INGESTION & PIPELINE HEALTH MONITOR</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              STREAM TELEMETRY
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Live queue depth, adapter connectivity, measured processing latencies, and operational freshness monitors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-xs font-mono">
            {wsStatus === 'CONNECTED' ? (
              <>
                <Wifi className="w-4 h-4 text-socsuccess animate-pulse" />
                <span className="text-socsuccess font-bold">WEBSOCKET: LIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-socwarning" />
                <span className="text-socwarning font-bold">WS: {wsStatus}</span>
              </>
            )}
          </div>

          <button
            onClick={fetchHealth}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Freshness Warnings Banner */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-amber-500/15 border border-socwarning/40 text-xs font-mono text-softwhite flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-socwarning flex-shrink-0" />
              <div>
                <span className="font-bold text-socwarning">Operational Freshness Warning: </span>
                {w.warning} ({w.name})
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-Time Processing Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 space-y-1">
          <span className="text-[10px] text-mutedslate uppercase">Current Queue Depth</span>
          <p className="text-2xl font-bold text-gold">{queue.queue_depth} <span className="text-xs text-slate-500 font-normal">pending</span></p>
          <p className="text-[10px] text-slate-400">Total enqueued: {queue.total_enqueued}</p>
        </div>

        <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 space-y-1">
          <span className="text-[10px] text-mutedslate uppercase">Throughput Velocity</span>
          <p className="text-2xl font-bold text-socsuccess">{queue.events_processed_per_minute} <span className="text-xs text-slate-500 font-normal">epm</span></p>
          <p className="text-[10px] text-slate-400">Received rate: {queue.events_received_per_minute} epm</p>
        </div>

        <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 space-y-1">
          <span className="text-[10px] text-mutedslate uppercase">Measured Detection Latency</span>
          <p className="text-2xl font-bold text-royal-200">{queue.avg_detection_latency_ms} <span className="text-xs text-slate-500 font-normal">ms</span></p>
          <p className="text-[10px] text-slate-400">Time to rule evaluation</p>
        </div>

        <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 space-y-1">
          <span className="text-[10px] text-mutedslate uppercase">Measured Incident Latency</span>
          <p className="text-2xl font-bold text-softwhite">{queue.avg_incident_latency_ms} <span className="text-xs text-slate-500 font-normal">ms</span></p>
          <p className="text-[10px] text-slate-400">Time to RCA & response</p>
        </div>
      </div>

      {/* Collectors & Data Sources Management Grid */}
      <div className="bg-navy-800 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-700">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-5 h-5 text-gold" />
            <h3 className="text-sm font-semibold text-softwhite font-mono">Configured Continuous Telemetry Collectors</h3>
          </div>
          <span className="text-xs text-mutedslate font-mono">{collectors.length} adapters registered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {collectors.map((col) => {
            const isToggling = toggling === col.collector_id;
            return (
              <div
                key={col.collector_id}
                className="p-4 rounded-xl bg-navy-900 border border-slate-700/80 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-softwhite text-sm">{col.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      col.status === 'RECEIVING' ? 'bg-emerald-500/20 text-socsuccess border border-socsuccess/40 animate-pulse' :
                      col.status === 'CONNECTED' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' :
                      col.status === 'STALE' ? 'bg-amber-500/20 text-socwarning border border-socwarning/40' :
                      'bg-slate-700/30 text-slate-400 border border-slate-600'
                    }`}>
                      {col.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>Type: <span className="text-royal-200">{col.collector_type}</span></div>
                    <div>Received: <span className="text-softwhite font-bold">{col.total_received}</span></div>
                    <div>Processed: <span className="text-socsuccess font-bold">{col.total_processed}</span></div>
                    <div>Errors: <span className={col.error_count > 0 ? 'text-soccritical' : 'text-slate-500'}>{col.error_count}</span></div>
                  </div>

                  <div className="mt-2 text-[10px] text-mutedslate truncate">
                    Last Event: {col.last_event_at ? new Date(col.last_event_at).toLocaleTimeString() : 'No events yet'}
                  </div>
                </div>

                {col.collector_type !== 'API' && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleToggleCollector(col.collector_id)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                        col.is_running
                          ? 'bg-red-500/15 border border-soccritical text-soccritical hover:bg-red-500/25'
                          : 'bg-emerald-500/15 border border-socsuccess text-socsuccess hover:bg-emerald-500/25'
                      }`}
                    >
                      {col.is_running ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Adapter</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Adapter</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Status Summary Card */}
      <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl font-mono text-xs space-y-3">
        <h4 className="text-softwhite font-semibold flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-royal-200" />
          <span>Real-Time Engine Health Attributes</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
            <span className="text-mutedslate text-[10px]">ML Anomaly Model</span>
            <p className="text-softwhite font-bold mt-0.5">Isolation Forest v1.2 (Active)</p>
          </div>
          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
            <span className="text-mutedslate text-[10px]">WebSocket Streaming Channel</span>
            <p className="text-socsuccess font-bold mt-0.5">/api/ws (Persistent)</p>
          </div>
          <div className="p-3 rounded-xl bg-navy-900 border border-slate-800">
            <span className="text-mutedslate text-[10px]">Zero Data Loss Recovery</span>
            <p className="text-gold font-bold mt-0.5">DB Checkpoint Requeue Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
