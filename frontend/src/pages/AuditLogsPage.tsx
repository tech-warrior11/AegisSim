import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  UserCheck, 
  ShieldAlert, 
  Terminal, 
  Clock,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.audit.getAll({ limit: 100 });
      setLogs(res.data.items || []);
      setFilteredLogs(res.data.items || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = logs;
    if (actionFilter !== 'all') {
      result = result.filter(l => l.action.toLowerCase().includes(actionFilter.toLowerCase()));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(l => 
        l.actor.toLowerCase().includes(q) || 
        l.action.toLowerCase().includes(q) ||
        (l.resource && l.resource.toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.toLowerCase().includes(q))
      );
    }
    setFilteredLogs(result);
  }, [actionFilter, searchTerm, logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-pink-400" />
            SOC Audit Trail & Operations Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Immutable chain-of-custody logging of analyst actions, rule modifications, triage status updates, and lab executions.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-[#09090b] border border-slate-800/60 rounded-lg text-xs font-mono text-slate-300">
          Recorded Audit Actions: <strong className="text-pink-400">{logs.length}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="cyber-card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by actor, action, resource, or IP address..."
            className="w-full bg-slate-950 border border-slate-800/60 pl-9 pr-4 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'auth', 'incident', 'detection', 'simulation'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-all ${
                actionFilter === act
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-950'
                  : 'bg-[#09090b] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="cyber-card p-5 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading SOC audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No audit log entries found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Actor</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Target Resource</th>
                  <th className="pb-3 font-medium">Source IP</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-pink-400">
                      {log.actor}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-sans text-slate-200 font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      {log.resource || '-'}
                    </td>
                    <td className="py-3 text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 text-slate-400 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

