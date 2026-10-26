import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Incident } from '../types';
import { FileText, Download, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export const Reports: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');

  useEffect(() => {
    api.getIncidents().then((data) => {
      setIncidents(data);
      if (data.length > 0) {
        setSelectedIncidentId(data[0].incident_id);
      }
    }).catch(console.error);
  }, []);

  const handleDownloadExecutivePDF = () => {
    window.open('/api/reports/summary/pdf', '_blank');
  };

  const handleDownloadIncidentPDF = () => {
    if (!selectedIncidentId) return;
    window.open(`/api/reports/incidents/${selectedIncidentId}/pdf`, '_blank');
  };

  const handleExportEventsCSV = () => {
    window.open('/api/events/export/csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
          <span>SOC EXECUTIVE & INCIDENT DOSSIER REPORTS</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
            COMPLIANCE & AUDIT
          </span>
        </h1>
        <p className="text-xs text-mutedslate mt-1 font-mono">
          Download branded executive briefing documents and evidence-grounded incident forensic reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Executive Summary PDF Card */}
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-royal/20 border border-royal/40 flex items-center justify-center text-royal-200 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-softwhite">Global SOC Executive Summary Briefing</h3>
            <p className="text-xs text-mutedslate mt-2 leading-relaxed">
              Generates a PDF briefing containing high-level operational posture, threat volume, incident counts, containment rates, and autonomous agent statuses.
            </p>
          </div>

          <button
            onClick={handleDownloadExecutivePDF}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Executive Briefing (PDF)</span>
          </button>
        </div>

        {/* Incident Dossier PDF Card */}
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-softwhite">Individual Incident Forensic Dossier</h3>
            <p className="text-xs text-mutedslate mt-2 leading-relaxed">
              Download the complete 8-question AI investigation summary, chronological event telemetry table, risk breakdown, and SOAR response certificate.
            </p>

            <div className="mt-4 font-mono text-xs">
              <label className="block text-mutedslate mb-1">Select Target Incident</label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-softwhite focus:border-royal outline-none"
              >
                {incidents.map((i) => (
                  <option key={i.incident_id} value={i.incident_id}>
                    {i.incident_id} — {i.title} ({i.severity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadIncidentPDF}
            disabled={!selectedIncidentId}
            className="w-full py-3 rounded-xl bg-navy-700 border border-slate-600 hover:bg-navy-600 text-softwhite font-medium text-xs font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download Incident Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* Raw Data Exports */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
        <h3 className="text-sm font-semibold text-softwhite">Raw SIEM Data Exports</h3>
        <p className="text-mutedslate">Export normalized historical telemetry for external SIEM integration or archival:</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportEventsCSV}
            className="px-4 py-2.5 rounded-xl bg-navy-900 border border-slate-700 hover:border-royal text-softwhite transition flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-royal-200" />
            <span>Export Normalized Security Events (CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
