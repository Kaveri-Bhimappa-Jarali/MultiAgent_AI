import React, { useState } from 'react';
import { api } from '../api/client';
import { Layers, UploadCloud, CheckCircle2, AlertCircle, FileText, Send, Sparkles } from 'lucide-react';

export const Ingestion: React.FC = () => {
  // Form State
  const [eventType, setEventType] = useState('authentication');
  const [severity, setSeverity] = useState('MEDIUM');
  const [sourceIp, setSourceIp] = useState('198.51.100.23');
  const [destIp, setDestIp] = useState('10.0.1.10');
  const [destPort, setDestPort] = useState('443');
  const [username, setUsername] = useState('alex.turner');
  const [host, setHost] = useState('WS-SEC-01');
  const [commandLine, setCommandLine] = useState('Failed SSH login attempt from external perimeter');

  // Batch JSON / CSV State
  const [batchJson, setBatchJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSingleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.ingestEvent({
        event_type: eventType,
        severity: severity as any,
        source_ip: sourceIp || undefined,
        destination_ip: destIp || undefined,
        destination_port: destPort ? parseInt(destPort) : undefined,
        username: username || undefined,
        host: host || undefined,
        command_line: commandLine || undefined,
        is_simulated: false,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to ingest event');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchIngest = async () => {
    if (!batchJson.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(batchJson);
      const eventsList = Array.isArray(parsed) ? parsed : [parsed];
      const res = await api.importBatch(eventsList);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format or batch import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleBatch = () => {
    const samples = [
      {
        event_type: "network_connection",
        severity: "MEDIUM",
        source_ip: "192.0.2.144",
        destination_ip: "10.0.1.50",
        destination_port: 80,
        protocol: "TCP",
        host: "WEB-PROD-01",
        command_line: "SYN scan probe to port 80"
      },
      {
        event_type: "network_connection",
        severity: "HIGH",
        source_ip: "192.0.2.144",
        destination_ip: "10.0.1.50",
        destination_port: 445,
        protocol: "TCP",
        host: "WEB-PROD-01",
        command_line: "SYN scan probe to port 445 (SMB)"
      },
      {
        event_type: "authentication",
        severity: "HIGH",
        source_ip: "198.51.100.23",
        username: "vikram.sharma",
        host: "VPN-GW-01",
        file_action: "FAILED",
        command_line: "VPN Auth failure for vikram.sharma"
      },
      {
        event_type: "process_execution",
        severity: "CRITICAL",
        username: "vikram.sharma",
        host: "DB-FIN-01",
        process_name: "powershell.exe",
        command_line: "powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAB..."
      }
    ];
    setBatchJson(JSON.stringify(samples, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
          <span>SECURITY DATA INGESTION PIPELINE</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
            CANONICAL PARSER
          </span>
        </h1>
        <p className="text-xs text-mutedslate mt-1 font-mono">
          Ingest, validate and normalize raw telemetry logs with automatic deduplication and detection triggering.
        </p>
      </div>

      {/* Result / Error Notification */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-socsuccess/40 text-xs font-mono text-softwhite flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-socsuccess flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-socsuccess">Ingestion Cycle Completed Successfully</h4>
            <p>
              Received: <span className="font-bold">{result.total_received}</span> | Accepted: <span className="font-bold text-socsuccess">{result.accepted}</span> | Duplicates Skipped: <span className="font-bold text-gold">{result.duplicates_skipped}</span> | Detections Triggered: <span className="font-bold text-soccritical">{result.detections_triggered}</span>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-soccritical/40 text-xs font-mono text-soccritical flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Event Ingestion Form */}
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-navy-700">
            <Send className="w-5 h-5 text-royal-200" />
            <h3 className="text-sm font-semibold text-softwhite">Single Telemetry Event Ingest</h3>
          </div>

          <form onSubmit={handleSingleIngest} className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-mutedslate mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                >
                  <option value="authentication">authentication</option>
                  <option value="network_connection">network_connection</option>
                  <option value="process_execution">process_execution</option>
                  <option value="privilege_escalation">privilege_escalation</option>
                  <option value="file_access">file_access</option>
                </select>
              </div>

              <div>
                <label className="block text-mutedslate mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                >
                  <option value="INFO">INFO</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-mutedslate mb-1">Source IP</label>
                <input
                  type="text"
                  value={sourceIp}
                  onChange={(e) => setSourceIp(e.target.value)}
                  placeholder="e.g. 198.51.100.23"
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                />
              </div>

              <div>
                <label className="block text-mutedslate mb-1">Destination IP</label>
                <input
                  type="text"
                  value={destIp}
                  onChange={(e) => setDestIp(e.target.value)}
                  placeholder="e.g. 10.0.1.10"
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-mutedslate mb-1">Dest Port</label>
                <input
                  type="text"
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  placeholder="443"
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                />
              </div>

              <div>
                <label className="block text-mutedslate mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex.turner"
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                />
              </div>

              <div>
                <label className="block text-mutedslate mb-1">Host Target</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="WS-SEC-01"
                  className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-mutedslate mb-1">Command Line / Payload Details</label>
              <textarea
                rows={3}
                value={commandLine}
                onChange={(e) => setCommandLine(e.target.value)}
                placeholder="Command or log payload..."
                className="w-full bg-navy-900 border border-slate-700 rounded-lg p-2 text-softwhite focus:border-royal outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs transition shadow-md shadow-royal/20 disabled:opacity-50"
            >
              {loading ? 'Processing Normalization...' : 'Send Event to Pipeline'}
            </button>
          </form>
        </div>

        {/* Batch JSON Ingestion */}
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-700">
              <div className="flex items-center space-x-2.5">
                <UploadCloud className="w-5 h-5 text-gold" />
                <h3 className="text-sm font-semibold text-softwhite">Batch JSON Telemetry Import</h3>
              </div>

              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-navy-900 border border-slate-700 text-gold hover:bg-gold/15 text-[11px] font-mono transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Logs</span>
              </button>
            </div>

            <p className="text-xs text-mutedslate font-mono mb-2">
              Paste an array of raw or normalized JSON objects matching canonical schema:
            </p>

            <textarea
              rows={12}
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
              placeholder="[&#10;  {&#10;    &quot;event_type&quot;: &quot;authentication&quot;,&#10;    &quot;severity&quot;: &quot;HIGH&quot;,&#10;    &quot;source_ip&quot;: &quot;198.51.100.23&quot;,&#10;    &quot;username&quot;: &quot;sarah.connor&quot;&#10;  }&#10;]"
              className="w-full font-mono text-xs bg-navy-950 border border-slate-800 rounded-xl p-3 text-slate-300 placeholder-slate-600 focus:border-royal outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleBatchIngest}
            disabled={loading || !batchJson.trim()}
            className="w-full mt-4 py-2.5 rounded-xl bg-navy-700 border border-slate-600 hover:bg-navy-600 text-softwhite font-medium text-xs font-mono transition disabled:opacity-50"
          >
            {loading ? 'Batch Processing...' : 'Validate & Import Batch'}
          </button>
        </div>
      </div>
    </div>
  );
};
