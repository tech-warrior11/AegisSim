import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  ShieldCheck, 
  ExternalLink,
  Plus,
  Printer,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import SeverityBadge from '../components/SeverityBadge';

interface ReportItem {
  id: string;
  incident_id: string;
  title: string;
  format: string;
  generated_at: string;
  content: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('markdown');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    fetchReportsAndIncidents();
  }, []);

  const fetchReportsAndIncidents = async () => {
    setIsLoading(true);
    try {
      const [repRes, incRes] = await Promise.all([
        api.reports.getAll(),
        api.incidents.getAll({ limit: 50 })
      ]);
      setReports(repRes.data);
      setIncidents(incRes.data.items || []);
      if (incRes.data.items && incRes.data.items.length > 0) {
        setSelectedIncidentId(incRes.data.items[0].incident_id);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedIncidentId) return;

    setIsGenerating(true);
    try {
      const res = await api.reports.generate(selectedIncidentId, selectedFormat);
      setShowGenerateModal(false);
      fetchReportsAndIncidents();
      setSelectedReport(res.data);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = (report: ReportItem) => {
    const extension = report.format === 'json' ? 'json' : report.format === 'csv' ? 'csv' : 'md';
    const mimeType = report.format === 'json' ? 'application/json' : report.format === 'csv' ? 'text/csv' : 'text/markdown';
    const blob = new Blob([report.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_report_${report.incident_id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-pink-400" />
            Executive Security Reports & Post-Mortems
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated SOC compliance reports, incident root-cause post-mortems, and chain-of-custody evidence archives.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-md shadow-pink-950/40"
        >
          <Plus className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      {/* Reports Grid */}
      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Generated Incident Reports ({reports.length})
        </h2>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading security reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No reports generated yet. Select an incident above to generate an executive post-mortem.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div 
                key={report.id}
                className="p-4 bg-[#09090b]/60 hover:bg-[#09090b] border border-slate-800/60 hover:border-slate-700 rounded-3xl space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-pink-400">
                      {report.incident_id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] uppercase font-mono font-semibold text-slate-300 border border-slate-800/60">
                      {report.format}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-2">
                    {report.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(report.generated_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-pink-400" /> View
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" /> Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="cyber-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-pink-400" />
              Generate Incident Security Report
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Incident Case</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/60 rounded p-2 text-slate-200 focus:border-pink-500 focus:outline-none"
                >
                  {incidents.map((inc) => (
                    <option key={inc.incident_id} value={inc.incident_id}>
                      {inc.incident_id} - {inc.title.slice(0, 40)}... ({inc.severity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {['markdown', 'json', 'csv'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedFormat(fmt)}
                      className={`py-2 rounded uppercase font-semibold text-xs transition-all ${
                        selectedFormat === fmt
                          ? 'bg-pink-600 text-white shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating || !selectedIncidentId}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Compile Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Viewer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="cyber-card max-w-4xl w-full max-h-[90vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-pink-400">{selectedReport.incident_id}</span>
                <span className="px-2 py-0.5 text-xs bg-slate-950 rounded uppercase font-mono text-slate-300 border border-slate-800/60">
                  {selectedReport.format}
                </span>
                <h3 className="text-base font-bold text-white ml-2">{selectedReport.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" /> Export
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-5 rounded-lg border border-slate-800/60 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-pink-900">
              {selectedReport.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

