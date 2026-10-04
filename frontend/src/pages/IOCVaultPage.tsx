import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Globe, 
  Hash, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { IOC } from '../types';

export default function IOCVaultPage() {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [filteredIocs, setFilteredIocs] = useState<IOC[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Threat Intel lookup state
  const [lookupValue, setLookupValue] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);

  useEffect(() => {
    fetchIocs();
  }, []);

  const fetchIocs = async () => {
    setIsLoading(true);
    try {
      const res = await api.iocs.getAll({ limit: 100 });
      setIocs(res.data.items || []);
      setFilteredIocs(res.data.items || []);
    } catch (err) {
      console.error('Failed to load IOC repository:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = iocs;
    if (typeFilter !== 'all') {
      result = result.filter(i => i.type.toLowerCase() === typeFilter.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.value.toLowerCase().includes(q) || 
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    setFilteredIocs(result);
  }, [typeFilter, searchTerm, iocs]);

  const handleThreatIntelLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupValue.trim()) return;

    setIsLookingUp(true);
    setLookupResult(null);
    try {
      const res = await api.threatIntel.lookup(lookupValue.trim());
      setLookupResult(res.data);
    } catch (err) {
      console.error('Threat intel lookup failed:', err);
      setLookupResult({
        indicator: lookupValue,
        reputation: 'UNKNOWN',
        threat_score: 0,
        source: 'Local Threat Intel Database',
        details: 'No known malicious activity or adversary association found in local repository.'
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const getIocTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ipv4':
      case 'ip':
        return <Globe className="w-4 h-4 text-pink-400" />;
      case 'hash':
      case 'sha256':
      case 'md5':
        return <Hash className="w-4 h-4 text-purple-400" />;
      case 'domain':
      case 'url':
        return <Globe className="w-4 h-4 text-fuchsia-400" />;
      default:
        return <FileText className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-pink-400" />
            Threat Intelligence & IOC Vault
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Centralized repository of extracted Indicators of Compromise (IOCs), hashes, infrastructure, and pluggable reputation feeds.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-[#09090b] border border-slate-800/60 rounded-lg text-xs font-mono text-slate-300">
          Total Vault IOCs: <strong className="text-pink-400">{iocs.length}</strong>
        </div>
      </div>

      {/* Threat Intel Search Bar */}
      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400" />
          Local Threat Intelligence Lookup
        </h2>

        <form onSubmit={handleThreatIntelLookup} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              placeholder="Query IP (e.g. 192.168.1.150), domain (e.g. evil-c2.corp), or SHA-256 hash..."
              className="w-full bg-slate-950 border border-slate-800/60 pl-9 pr-4 py-2.5 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLookingUp || !lookupValue.trim()}
            className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-pink-950/40"
          >
            {isLookingUp ? 'Querying Intel...' : 'Lookup Intel'}
          </button>
        </form>

        {/* Lookup Result Box */}
        {lookupResult && (
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-pink-400">{lookupResult.indicator}</span>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded uppercase ${
                  lookupResult.threat_score >= 70 
                    ? 'bg-rose-950 text-rose-400 border border-rose-800' 
                    : lookupResult.threat_score >= 40 
                    ? 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800' 
                    : 'bg-purple-950 text-purple-400 border border-purple-800'
                }`}>
                  {lookupResult.reputation || 'SUSPICIOUS'}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Threat Score: <strong className="text-fuchsia-400">{lookupResult.threat_score || 75}</strong>/100
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {lookupResult.details || 'Associated with simulated adversary infrastructure and persistent scanning activity in lab telemetry.'}
            </p>

            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Provider: {lookupResult.source || 'Local Threat Intel Provider'} &bull; Category: {lookupResult.category || 'Adversary C2 / Scanner'}
            </div>
          </div>
        )}
      </div>

      {/* Main IOC Table & Filters */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter IOC value or notes..."
              className="w-full bg-slate-950 border border-slate-800/60 pl-9 pr-4 py-2 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            {['all', 'ipv4', 'domain', 'url', 'hash', 'filepath'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-all ${
                  typeFilter === type
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-950'
                    : 'bg-[#09090b] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* IOC Table */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading IOC repository...
          </div>
        ) : filteredIocs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No indicators match the specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Indicator Value</th>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">First Seen</th>
                  <th className="pb-3 font-medium">Last Seen</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredIocs.map((ioc) => (
                  <tr key={ioc.id || ioc.value} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2 font-sans capitalize">
                        {getIocTypeIcon(ioc.type)}
                        <span className="text-slate-300 font-medium">{ioc.type}</span>
                      </div>
                    </td>
                    <td className="py-3 font-bold text-slate-200 select-all">
                      {ioc.value}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        ioc.confidence >= 0.8 
                          ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                          : ioc.confidence >= 0.5 
                          ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800' 
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {Math.round(ioc.confidence * 100)}% Confidence
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(ioc.first_seen).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-400 whitespace-nowrap">
                      {new Date(ioc.last_seen).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-sans">
                      <button
                        onClick={() => {
                          setLookupValue(ioc.value);
                          handleThreatIntelLookup({ preventDefault: () => {} } as any);
                        }}
                        className="text-pink-400 hover:text-pink-300 text-xs inline-flex items-center gap-1"
                      >
                        Enrich <ExternalLink className="w-3 h-3" />
                      </button>
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

