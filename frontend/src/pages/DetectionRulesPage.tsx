import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Code2, 
  Plus, 
  Search, 
  Filter, 
  Power, 
  Tag, 
  CheckCircle, 
  AlertTriangle,
  FileCode,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { DetectionRule } from '../types';
import SeverityBadge from '../components/SeverityBadge';
import MitreTag from '../components/MitreTag';

export default function DetectionRulesPage() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<DetectionRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.detections.getAll();
      setRules(res.data);
      setFilteredRules(res.data);
      if (res.data.length > 0) {
        setSelectedRule(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch detection rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = rules;
    if (categoryFilter !== 'all') {
      result = result.filter(r => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (severityFilter !== 'all') {
      result = result.filter(r => r.severity.toLowerCase() === severityFilter.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.rule_id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.mitre_technique && r.mitre_technique.toLowerCase().includes(q))
      );
    }
    setFilteredRules(result);
  }, [categoryFilter, severityFilter, searchTerm, rules]);

  const handleToggleRule = async (rule: DetectionRule) => {
    try {
      const updatedEnabled = !rule.enabled;
      await api.detections.toggle(rule.rule_id, updatedEnabled);
      setRules(rules.map(r => r.rule_id === rule.rule_id ? { ...r, enabled: updatedEnabled } : r));
      if (selectedRule?.rule_id === rule.rule_id) {
        setSelectedRule({ ...selectedRule, enabled: updatedEnabled });
      }
      setFeedback(`Rule ${rule.rule_id} is now ${updatedEnabled ? 'ENABLED' : 'DISABLED'}`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to toggle rule state:', err);
    }
  };

  const categories = ['all', 'authentication', 'web', 'endpoint', 'network', 'privilege'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-pink-400" />
            Detection Engineering Rules
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sigma-inspired behavioral logic engine running real-time pattern, threshold, and correlation matches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#09090b] border border-slate-800/60 rounded-lg text-xs font-mono text-slate-300">
            Active: <span className="text-purple-400 font-bold">{rules.filter(r => r.enabled).length}</span> / {rules.length}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-pink-950/60 border border-pink-500/30 rounded-lg text-pink-200 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-pink-400" />
          {feedback}
        </div>
      )}

      {/* Filters Bar */}
      <div className="cyber-card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by rule name, rule ID, or MITRE technique..."
            className="w-full bg-slate-950 border border-slate-800/60 pl-9 pr-4 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                categoryFilter === cat 
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-950' 
                  : 'bg-[#09090b] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800/60 text-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-pink-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rules List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="cyber-card p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading detection rules...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="cyber-card p-8 text-center text-slate-500 text-sm">
              No detection rules match current filter criteria.
            </div>
          ) : (
            filteredRules.map((rule) => {
              const isSelected = selectedRule?.rule_id === rule.rule_id;
              return (
                <div
                  key={rule.rule_id}
                  onClick={() => setSelectedRule(rule)}
                  className={`cyber-card p-4 cursor-pointer transition-all border ${
                    isSelected 
                      ? 'border-pink-500 bg-[#09090b]/90 shadow-lg shadow-pink-950/20' 
                      : 'border-slate-800/60 hover:border-slate-700 bg-[#09090b]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-pink-400">{rule.rule_id}</span>
                        <SeverityBadge severity={rule.severity} size="sm" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200 line-clamp-1">{rule.name}</h3>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRule(rule);
                      }}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      className={`p-1.5 rounded transition-colors ${
                        rule.enabled 
                          ? 'text-purple-400 hover:bg-purple-950/50' 
                          : 'text-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{rule.description}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60/60 text-[11px] text-slate-500">
                    <span className="capitalize">{rule.category}</span>
                    {rule.mitre_technique && (
                      <span className="font-mono text-slate-400">{rule.mitre_technique}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Rule Inspector (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedRule ? (
            <div className="cyber-card p-6 space-y-6 sticky top-20">
              <div className="flex items-start justify-between border-b border-slate-800/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-pink-400">{selectedRule.rule_id}</span>
                    <SeverityBadge severity={selectedRule.severity} />
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wider ${
                      selectedRule.enabled ? 'bg-purple-950 text-purple-400 border border-purple-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedRule.enabled ? 'Active Engine' : 'Disabled'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedRule.name}</h2>
                </div>

                <button
                  onClick={() => handleToggleRule(selectedRule)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    selectedRule.enabled 
                      ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/60' 
                      : 'bg-purple-950/40 border-purple-800 text-purple-300 hover:bg-purple-900/60'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {selectedRule.enabled ? 'Disable Rule' : 'Enable Rule'}
                </button>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Description</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedRule.description}</p>
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                  <div className="text-[11px] text-slate-500 uppercase">Category</div>
                  <div className="text-sm font-semibold text-slate-200 capitalize mt-0.5">{selectedRule.category}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                  <div className="text-[11px] text-slate-500 uppercase">Confidence</div>
                  <div className="text-sm font-semibold text-pink-400 mt-0.5">High (95%)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                  <div className="text-[11px] text-slate-500 uppercase">MITRE Tactic</div>
                  <div className="text-xs font-semibold text-slate-200 mt-0.5">{selectedRule.mitre_tactic || 'Execution'}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
                  <div className="text-[11px] text-slate-500 uppercase">MITRE ID</div>
                  <div className="text-xs font-mono font-bold text-fuchsia-400 mt-0.5">{selectedRule.mitre_technique || 'T1059'}</div>
                </div>
              </div>

              {/* Threshold & Aggregation Details */}
              {selectedRule.threshold && (
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-pink-400" />
                    Sliding Window Threshold Criteria
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-400 pt-1 font-mono">
                    <div>Count: <strong className="text-pink-300">{selectedRule.threshold.count} events</strong></div>
                    <div>Window: <strong className="text-pink-300">{selectedRule.threshold.window_minutes} min</strong></div>
                    <div>Group By: <strong className="text-slate-200">{selectedRule.group_by ? selectedRule.group_by.join(', ') : 'source_ip'}</strong></div>
                  </div>
                </div>
              )}

              {/* Sigma-Inspired YAML Rule Definition */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-pink-400" />
                    Rule Specification (YAML / Sigma Standard)
                  </h4>
                </div>
                <div className="bg-slate-950 border border-slate-800/60 rounded-lg p-4 font-mono text-xs text-pink-300 overflow-x-auto leading-relaxed shadow-inner">
                  {selectedRule.raw_yaml ? (
                    <pre>{selectedRule.raw_yaml}</pre>
                  ) : (
                    <pre>{`name: "${selectedRule.name}"
id: "${selectedRule.rule_id}"
severity: "${selectedRule.severity}"
category: "${selectedRule.category}"

condition:
  event_type: "${selectedRule.category}"
  match: "behavioral_pattern"

mitre_attack:
  tactic: "${selectedRule.mitre_tactic || 'Execution'}"
  technique: "${selectedRule.mitre_technique || 'T1059'}"

description: "${selectedRule.description}"`}</pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="cyber-card p-12 text-center text-slate-500">
              Select a detection rule on the left to inspect its parameters, sliding-window thresholds, and YAML specification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

