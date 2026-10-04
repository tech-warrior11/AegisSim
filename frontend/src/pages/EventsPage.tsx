import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Code,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ApiService } from "../services/api";
import { SecurityEvent } from "../types";
import { SeverityBadge } from "../components/common/SeverityBadge";

export const EventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [rawPayload, setRawPayload] = useState(
    '{\n  "source": "linux-auth",\n  "host": "lab-linux-01",\n  "event_type": "authentication",\n  "action": "login_failed",\n  "user": "root",\n  "source_ip": "10.10.10.50",\n  "raw_message": "Failed password for root from 10.10.10.50 port 49120 ssh2"\n}'
  );

  const [filterType, setFilterType] = useState(searchParams.get("event_type") || "");
  const [filterSeverity, setFilterSeverity] = useState(searchParams.get("severity") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(0);
  const limit = 25;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getEvents({
        event_type: filterType || undefined,
        severity: filterSeverity || undefined,
        search: searchQuery || undefined,
        host: searchParams.get("host") || undefined,
        source_ip: searchParams.get("source_ip") || undefined,
        limit,
        offset: page * limit,
      });
      setEvents(res.data.events);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, filterType, filterSeverity, searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchEvents();
  };

  const handleIngestSubmit = async () => {
    try {
      const parsed = JSON.parse(rawPayload);
      await ApiService.ingestEvent(parsed);
      setShowIngestModal(false);
      fetchEvents();
    } catch (err: any) {
      alert("Invalid JSON payload: " + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-pink-400" />
            Data Stream & Signal Injection
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Normalized SIEM telemetry across endpoints, network, and identities ({total.toLocaleString()} records).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIngestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-3xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-pink-900/20"
          >
            <Plus className="w-4 h-4" /> Inject Raw Signal
          </button>
          <button
            onClick={() => fetchEvents()}
            className="p-2 rounded-3xl bg-[#0e0c15] hover:bg-[#1a142c] text-purple-300 border border-purple-500/30"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 flex flex-col md:flex-row items-center gap-4 justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search raw messages, processes, IPs, users..."
            className="w-full bg-[#09090b] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-mono"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
            className="bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
          >
            <option value="">All Streams</option>
            <option value="authentication">Identity / Auth</option>
            <option value="web">Web Node</option>
            <option value="endpoint">Endpoint / Process</option>
            <option value="network">Network Flow</option>
            <option value="privilege">Privilege Escalation</option>
            <option value="file">File Access</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => { setFilterSeverity(e.target.value); setPage(0); }}
            className="bg-[#09090b] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
          >
            <option value="">All Impacts</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#120f1c] text-purple-300 font-mono uppercase tracking-wider text-[11px] border-b border-slate-800/60/60">
              <tr>
                <th className="py-4 px-5">Timestamp (UTC)</th>
                <th className="py-4 px-5">Impact</th>
                <th className="py-4 px-5">Stream / Action</th>
                <th className="py-4 px-5">Target Node</th>
                <th className="py-4 px-5">Vector IP</th>
                <th className="py-4 px-5">Identity</th>
                <th className="py-4 px-5">Raw Signal</th>
                <th className="py-4 px-5 text-right">Examine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading signal telemetry...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching signals found. Adjust matrix filters.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-purple-950/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td className="py-3 px-5 whitespace-nowrap text-slate-300">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-5">
                      <SeverityBadge severity={ev.severity} size="sm" />
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-pink-400 font-semibold">{ev.event_type}</span>
                      <span className="text-slate-400"> / {ev.action}</span>
                    </td>
                    <td className="py-3 px-5 text-slate-300">{ev.host}</td>
                    <td className="py-3 px-5 text-purple-400">{ev.source_ip || "-"}</td>
                    <td className="py-3 px-5 text-pink-300">{ev.user || "-"}</td>
                    <td className="py-3 px-5 text-slate-300 max-w-md truncate">
                      {ev.raw_message}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className="px-2 py-1 rounded bg-[#1a142c] hover:bg-[#2a1f3d] text-pink-400 text-[10px]"
                      >
                        DATA
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Showing {events.length > 0 ? page * limit + 1 : 0} to{" "}
            {Math.min((page + 1) * limit, total)} of {total.toLocaleString()} events
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-200">Page {page + 1}</span>
            <button
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0c15] border border-purple-500/30 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[0_0_40px_rgba(168,85,247,0.1)] overflow-hidden">
            <div className="p-5 border-b border-slate-800/60/60 flex items-center justify-between bg-[#120f1c]">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-pink-400" />
                <h3 className="font-mono font-bold text-sm text-slate-200">
                  Data Node (`{selectedEvent.id}`)
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-pink-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto font-mono text-xs text-purple-300 bg-[#09090b]">
              <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
            </div>
            <div className="p-3 border-t border-slate-800/60 flex justify-end bg-[#09090b]/60">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synthetic Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0c15] border border-purple-500/30 rounded-3xl max-w-xl w-full p-6 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans font-black tracking-wide text-base text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-pink-400" /> Matrix Signal Injection
              </h3>
              <button onClick={() => setShowIngestModal(false)} className="text-slate-400 hover:text-pink-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              Input raw JSON to push into the telemetry processor:
            </p>
            <textarea
              rows={8}
              value={rawPayload}
              onChange={(e) => setRawPayload(e.target.value)}
              className="w-full bg-[#09090b] border border-slate-700/50 rounded-3xl p-4 text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowIngestModal(false)}
                className="px-5 py-2.5 rounded-3xl bg-[#120f1c] hover:bg-[#1a142c] text-xs font-bold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIngestSubmit}
                className="px-5 py-2.5 rounded-3xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg shadow-pink-600/30 transition-colors"
              >
                Inject Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

