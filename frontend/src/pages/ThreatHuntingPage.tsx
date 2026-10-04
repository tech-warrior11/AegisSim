import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Bookmark, 
  History, 
  Download, 
  Play, 
  Trash2, 
  Filter, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  Save,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityEvent } from '../types';
import SeverityBadge from '../components/SeverityBadge';
import MitreTag from '../components/MitreTag';
import { Link } from 'react-router-dom';

interface SavedHunt {
  id: string;
  name: string;
  description: string;
  query_dsl: string;
  created_at: string;
}

export default function ThreatHuntingPage() {
  const [queryDsl, setQueryDsl] = useState<string>('action = "login_failed" OR severity = "high"');
  const [results, setResults] = useState<SecurityEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [savedHunts, setSavedHunts] = useState<SavedHunt[]>([]);
  const [huntHistory, setHuntHistory] = useState<string[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [saveDesc, setSaveDesc] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedHunts();
    const history = localStorage.getItem('cr_hunt_history');
    if (history) {
      try {
        setHuntHistory(JSON.parse(history));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const fetchSavedHunts = async () => {
    try {
      const res = await api.hunt.getSaved();
      setSavedHunts(res.data);
    } catch (err) {
      console.error('Failed to load saved hunts:', err);
    }
  };

  const handleExecuteHunt = async (queryToRun?: string) => {
    const activeQuery = queryToRun || queryDsl;
    if (!activeQuery.trim()) return;

    setIsLoading(true);
    const start = performance.now();
    try {
      const res = await api.hunt.search({ query_dsl: activeQuery, limit: 100 });
      const elapsed = Math.round(performance.now() - start);
      setResults(res.data.events || []);
      setTotalCount(res.data.total_matched || 0);
      setExecutionTime(elapsed);

      // update history
      const updatedHistory = [activeQuery, ...huntHistory.filter(q => q !== activeQuery)].slice(0, 10);
      setHuntHistory(updatedHistory);
      localStorage.setItem('cr_hunt_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      console.error('Hunt execution failed:', err);
      setFeedback('Hunt query syntax error or execution failed.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveHunt = async () => {
    if (!saveName.trim() || !queryDsl.trim()) return;
    try {
      await api.hunt.save({
        name: saveName,
        description: saveDesc,
        query_dsl: queryDsl
      });
      setShowSaveModal(false);
      setSaveName('');
      setSaveDesc('');
      fetchSavedHunts();
      setFeedback('Hunt query saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save hunt:', err);
    }
  };

  const exportResultsCSV = () => {
    if (results.length === 0) return;
    const headers = ['event_id', 'timestamp', 'event_type', 'action', 'source_ip', 'destination_ip', 'user', 'host', 'severity'];
    const csvRows = [headers.join(',')];
    for (const r of results) {
      csvRows.push([
        `"${r.event_id}"`,
        `"${r.timestamp}"`,
        `"${r.event_type}"`,
        `"${r.action}"`,
        `"${r.source_ip || ''}"`,
        `"${r.destination_ip || ''}"`,
        `"${r.user || ''}"`,
        `"${r.host || ''}"`,
        `"${r.severity}"`
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat_hunt_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setTemplate = (template: string) => {
    setQueryDsl(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-pink-400" />
            Threat Hunting Workbench
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Query normalized telemetry across all endpoints, networks, and authentication layers using filter expressions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700"
          >
            <Bookmark className="w-4 h-4 text-fuchsia-400" />
            Save Query
          </button>
          <button
            onClick={exportResultsCSV}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg text-sm border border-slate-700"
          >
            <Download className="w-4 h-4 text-purple-400" />
            Export CSV
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-pink-950/60 border border-pink-500/30 rounded-lg text-pink-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-pink-400" />
          {feedback}
        </div>
      )}

      {/* Query Console */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-pink-400 uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            Hunter Query DSL
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Syntax:</span>
            <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">field = "value"</code>
            <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">AND / OR</code>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={queryDsl}
            onChange={(e) => setQueryDsl(e.target.value)}
            rows={3}
            placeholder='e.g. source_ip = "10.10.10.50" OR user = "admin" OR event_type = "process"'
            className="w-full bg-slate-950 border border-slate-800/60 focus:border-pink-500 text-pink-100 font-mono text-sm p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500/50 resize-y"
          />
        </div>

        {/* Quick query templates */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-500">Quick Templates:</span>
          <button 
            onClick={() => setTemplate('action = "login_failed" AND user = "root"')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
          >
            Root Auth Failures
          </button>
          <button 
            onClick={() => setTemplate('event_type = "web" AND severity = "high"')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
          >
            High Web Threats
          </button>
          <button 
            onClick={() => setTemplate('process = "powershell.exe" OR process = "cmd.exe"')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
          >
            Suspicious Shells
          </button>
          <button 
            onClick={() => setTemplate('event_type = "privilege"')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
          >
            Privilege Escalations
          </button>
          <button 
            onClick={() => setTemplate('source_ip = "192.168.1.150"')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60"
          >
            Attacker IP Pivoting
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="text-xs text-slate-400">
            {executionTime > 0 && (
              <span>Query completed in <strong className="text-pink-400">{executionTime}ms</strong> &bull; Matched <strong className="text-slate-200">{totalCount}</strong> events</span>
            )}
          </div>
          <button
            onClick={() => handleExecuteHunt()}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-pink-900/20 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Executing Hunt...' : 'Run Hunt Query'}
          </button>
        </div>
      </div>

      {/* Main Grid: Results & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Results Table */}
        <div className="lg:col-span-3 cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Filter className="w-4 h-4 text-pink-400" />
              Telemetry Results ({results.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Scanning event data lake...
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              No telemetry events matched the query expression. Adjust filter parameters or execute a scenario.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium">Host / IP</th>
                    <th className="pb-3 font-medium">User / Process</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium text-right">Pivot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {results.map((ev) => (
                    <tr key={ev.event_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 text-slate-400 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-pink-300 font-sans">
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-200 font-medium">{ev.action}</td>
                      <td className="py-2.5 text-slate-300">
                        <div>{ev.host}</div>
                        <div className="text-slate-500 text-[10px]">{ev.source_ip || '-'}</div>
                      </td>
                      <td className="py-2.5 text-slate-300">
                        <div>{ev.user || '-'}</div>
                        <div className="text-slate-500 text-[10px] truncate max-w-[150px]">{ev.process || '-'}</div>
                      </td>
                      <td className="py-2.5 font-sans">
                        <SeverityBadge severity={ev.severity} size="sm" />
                      </td>
                      <td className="py-2.5 text-right font-sans">
                        <Link
                          to={`/events?search=${ev.source_ip || ev.host || ''}`}
                          className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 text-xs"
                        >
                          Pivot <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side Panel: Saved Queries & History */}
        <div className="space-y-6">
          {/* Saved Hunts */}
          <div className="cyber-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-fuchsia-400" />
              Saved Hunts ({savedHunts.length})
            </h3>
            {savedHunts.length === 0 ? (
              <p className="text-xs text-slate-500">No saved hunts yet.</p>
            ) : (
              <div className="space-y-2">
                {savedHunts.map((h) => (
                  <div 
                    key={h.id}
                    onClick={() => {
                      setQueryDsl(h.query_dsl);
                      handleExecuteHunt(h.query_dsl);
                    }}
                    className="p-2.5 bg-[#09090b]/80 hover:bg-slate-800 border border-slate-800/60 hover:border-slate-700 rounded cursor-pointer transition-all group"
                  >
                    <div className="text-xs font-medium text-slate-200 group-hover:text-pink-400">
                      {h.name}
                    </div>
                    {h.description && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{h.description}</p>
                    )}
                    <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                      {h.query_dsl}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent History */}
          <div className="cyber-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-pink-400" />
              Query History
            </h3>
            {huntHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No recent queries executed.</p>
            ) : (
              <div className="space-y-2">
                {huntHistory.map((query, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setQueryDsl(query);
                      handleExecuteHunt(query);
                    }}
                    className="p-2 bg-[#09090b]/60 hover:bg-slate-800/80 border border-slate-800/60/80 rounded cursor-pointer transition-all"
                  >
                    <p className="text-xs font-mono text-slate-300 truncate">{query}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="cyber-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Save className="w-5 h-5 text-fuchsia-400" />
              Save Threat Hunt Query
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Hunt Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Lateral Movement PowerShell Detection"
                  className="w-full bg-slate-950 border border-slate-800/60 rounded p-2 text-slate-200 text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Description</label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  rows={2}
                  placeholder="What anomalous behavior does this query look for?"
                  className="w-full bg-slate-950 border border-slate-800/60 rounded p-2 text-slate-200 text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Query Expression</label>
                <div className="p-2 bg-slate-950 border border-slate-800/60 rounded text-xs font-mono text-pink-300">
                  {queryDsl}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHunt}
                className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs rounded font-medium"
              >
                Save Hunt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

