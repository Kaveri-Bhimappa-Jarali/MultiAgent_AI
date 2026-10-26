import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SecurityEvent } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Radio,
  FileCode,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export const Events: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const { status: wsStatus, subscribe } = useWebSocket();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getEvents({
        search: search || undefined,
        severity: severityFilter || undefined,
        event_type: typeFilter || undefined,
        limit,
        offset: page * limit,
      });
      setEvents(res.events);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, severityFilter, typeFilter, page]);

  // Real-time WebSocket streaming updates
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (newEvent: SecurityEvent) => {
      // Check if matches active filters
      if (severityFilter && newEvent.severity !== severityFilter) return;
      if (typeFilter && newEvent.event_type !== typeFilter) return;
      if (page === 0) {
        setEvents((prev) => [newEvent, ...prev.slice(0, limit - 1)]);
        setTotal((prev) => prev + 1);
      } else {
        setTotal((prev) => prev + 1);
      }
    });

    const unsub2 = subscribe('EVENT_PROCESSED', (procData: any) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === procData.event_id
            ? { ...e, processing_status: 'PROCESSED', detection_status: 'ANALYZED' }
            : e
        )
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [subscribe, severityFilter, typeFilter, page]);

  const handleExportCSV = () => {
    window.open('/api/events/export/csv', '_blank');
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>REAL-TIME SECURITY EVENT EXPLORER</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              SIEM STORAGE
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Filter, search and investigate normalized security events across network, identity and endpoint activity.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live Streaming Badge */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
              wsStatus === 'CONNECTED'
                ? 'bg-emerald-500/15 border-socsuccess text-socsuccess'
                : 'bg-navy-800 border-slate-700 text-socwarning'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${wsStatus === 'CONNECTED' ? 'animate-pulse' : ''}`} />
            <span>{wsStatus === 'CONNECTED' ? 'LIVE EVENT STREAM: ON' : `STREAM: ${wsStatus}`}</span>
          </div>

          <button
            onClick={fetchEvents}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-mutedslate absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by IP, user, host, command line, event ID..."
            className="w-full bg-navy-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-softwhite placeholder-slate-500 focus:outline-none focus:border-royal transition font-mono"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(0);
            }}
            className="bg-navy-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-softwhite font-mono focus:outline-none focus:border-royal"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="bg-navy-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-softwhite font-mono focus:outline-none focus:border-royal"
          >
            <option value="">All Event Types</option>
            <option value="authentication">Authentication</option>
            <option value="network_connection">Network</option>
            <option value="process_execution">Process Execution</option>
            <option value="privilege_escalation">Privilege Escalation</option>
            <option value="file_access">File Access</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-navy-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-navy-950/80 border-b border-navy-700 text-mutedslate uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Event ID / Time</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Source & Target</th>
                <th className="py-3 px-4">User / Host</th>
                <th className="py-3 px-4">Payload / Command</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 text-softwhite">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-mutedslate">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-royal" />
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-mutedslate">
                    No matching security events found.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.event_id}
                    onClick={() => setSelectedEvent(e)}
                    className="hover:bg-navy-700/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-royal-200">{e.event_id}</div>
                      <div className="text-[10px] text-mutedslate mt-0.5">
                        {new Date(e.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={e.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-300">
                      {e.event_type}
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs">
                      {e.source_ip ? `${e.source_ip}${e.source_port ? `:${e.source_port}` : ''}` : '—'}
                      {e.destination_ip && (
                        <span className="text-mutedslate"> → {e.destination_ip}{e.destination_port ? `:${e.destination_port}` : ''}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs">
                      {e.username && <span className="text-gold font-medium">{e.username} </span>}
                      {e.host && <span className="text-mutedslate">({e.host})</span>}
                      {!e.username && !e.host && '—'}
                    </td>
                    <td className="py-3 px-4 truncate max-w-sm text-slate-300" title={e.command_line || e.file_path || e.file_action || ''}>
                      {e.command_line || e.file_path || e.file_action || 'Activity Recorded'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-navy-900 border border-slate-700 text-mutedslate">
                        {e.detection_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-navy-700/80 bg-navy-900/60 flex items-center justify-between text-xs font-mono text-mutedslate">
          <div>
            Showing {events.length} of {total} events (Page {page + 1} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg bg-navy-800 border border-slate-700 hover:text-softwhite disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg bg-navy-800 border border-slate-700 hover:text-softwhite disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Event Details Modal / Drawer */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={`Security Event Inspector: ${selectedEvent?.event_id}`}
        maxWidth="2xl"
      >
        {selectedEvent && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-navy-900 border border-slate-800">
              <div>
                <span className="text-mutedslate">Timestamp:</span>
                <p className="text-softwhite font-semibold">{new Date(selectedEvent.timestamp).toUTCString()}</p>
              </div>
              <div>
                <span className="text-mutedslate">Severity:</span>
                <div className="mt-1"><SeverityBadge severity={selectedEvent.severity} size="sm" /></div>
              </div>
              <div>
                <span className="text-mutedslate">Event Type:</span>
                <p className="text-softwhite uppercase font-semibold">{selectedEvent.event_type}</p>
              </div>
              <div>
                <span className="text-mutedslate">Detection Status:</span>
                <p className="text-gold font-semibold">{selectedEvent.detection_status}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 space-y-2">
              <h4 className="text-softwhite font-semibold flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-royal-200" />
                <span>Entity Attributes</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Source IP: <span className="text-softwhite">{selectedEvent.source_ip || 'None'}</span></div>
                <div>Dest IP: <span className="text-softwhite">{selectedEvent.destination_ip || 'None'}</span></div>
                <div>Source Port: <span className="text-softwhite">{selectedEvent.source_port || 'None'}</span></div>
                <div>Dest Port: <span className="text-softwhite">{selectedEvent.destination_port || 'None'}</span></div>
                <div>Protocol: <span className="text-softwhite">{selectedEvent.protocol || 'None'}</span></div>
                <div>Host: <span className="text-softwhite">{selectedEvent.host || 'None'}</span></div>
                <div>User: <span className="text-softwhite">{selectedEvent.username || 'None'}</span></div>
                <div>Process Name: <span className="text-softwhite">{selectedEvent.process_name || 'None'}</span></div>
              </div>
              {selectedEvent.command_line && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-mutedslate">Command Line Invocation:</span>
                  <div className="p-2 rounded bg-navy-950 text-gold break-all mt-1">
                    {selectedEvent.command_line}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-softwhite font-semibold mb-1 flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-gold" />
                <span>Raw Telemetry Evidence Payload</span>
              </h4>
              <pre className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                {selectedEvent.raw_payload || JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
