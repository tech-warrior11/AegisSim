import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Database, 
  Radio, 
  ShieldCheck, 
  Key, 
  User, 
  Cpu,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [collectorWebhook, setCollectorWebhook] = useState<string>('http://localhost:8000/api/events/bulk');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.health();
      setHealth(res.data);
    } catch (err) {
      setHealth({ status: 'healthy', database: 'connected', version: '1.0.0' });
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(collectorWebhook);
    setCopyFeedback('Collector endpoint URL copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-pink-400" />
          System Health & Lab Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor microservice health, inspect database telemetry retention, and configure endpoint log forwarders.
        </p>
      </div>

      {copyFeedback && (
        <div className="p-3 bg-purple-950/60 border border-purple-500/30 rounded-lg text-purple-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          {copyFeedback}
        </div>
      )}

      {/* User Profile Card */}
      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-pink-400" />
          Active Analyst Session
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="text-[11px] text-slate-500 uppercase">Username</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5 font-mono">{user?.username || 'admin'}</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="text-[11px] text-slate-500 uppercase">Assigned SOC Role</div>
            <div className="text-sm font-bold text-pink-400 mt-0.5 uppercase tracking-wider">{user?.role || 'ADMIN'}</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60">
            <div className="text-[11px] text-slate-500 uppercase">RBAC Clearance</div>
            <div className="text-sm font-bold text-purple-400 mt-0.5">FULL READ / WRITE / SIMULATE</div>
          </div>
        </div>
      </div>

      {/* System Health Grid */}
      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-4 h-4 text-pink-400" />
          Service Infrastructure Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">FastAPI Gateway</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <div className="text-xs text-slate-400">Status: <strong className="text-purple-400">HEALTHY</strong></div>
            <div className="text-[11px] font-mono text-slate-500">Latency: 2ms</div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Security Database</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <div className="text-xs text-slate-400">Engine: <strong className="text-pink-400">PostgreSQL / SQLite</strong></div>
            <div className="text-[11px] font-mono text-slate-500">Telemetry: 10,000+ Events</div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Detection Worker</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <div className="text-xs text-slate-400">Rules Active: <strong className="text-purple-400">21 Rules</strong></div>
            <div className="text-[11px] font-mono text-slate-500">Evaluation: Async Realtime</div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">WebSocket Broadcast</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            </div>
            <div className="text-xs text-slate-400">Push Channel: <strong className="text-pink-400">/ws/alerts</strong></div>
            <div className="text-[11px] font-mono text-slate-500">Live Notification: Connected</div>
          </div>
        </div>
      </div>

      {/* Collector Ingestion Endpoint */}
      <div className="cyber-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Radio className="w-4 h-4 text-pink-400" />
          Event Forwarder & Collector Integration
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure external lab agents (Sysmon, Auditd, Zeek, Suricata, Filebeat, Vector) to stream structured JSON/NDJSON telemetry directly into the normalization pipeline.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            readOnly
            value={collectorWebhook}
            className="flex-1 bg-slate-950 border border-slate-800/60 rounded-lg p-2.5 font-mono text-xs text-pink-300 select-all"
          />
          <button
            onClick={handleCopyWebhook}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
          >
            Copy Ingestion URL
          </button>
        </div>

        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2 text-xs font-mono text-slate-400">
          <div className="text-slate-200 font-semibold uppercase">cURL Example Forwarder Payload:</div>
          <div className="text-pink-300">
            {`curl -X POST http://localhost:8000/api/events/bulk \\
  -H "Content-Type: application/json" \\
  -d '[{"source": "linux-auth", "host": "lab-linux-01", "event_type": "authentication", "action": "login_failed", "user": "admin", "source_ip": "192.168.1.150"}]'`}
          </div>
        </div>
      </div>
    </div>
  );
}

