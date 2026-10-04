import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Shield,
  Clock,
  Server,
  User as UserIcon,
  Globe,
  FileCode2,
  HelpCircle,
} from "lucide-react";
import { ApiService } from "../services/api";
import { Alert } from "../types";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { MitreTag } from "../components/common/MitreTag";
import { RiskGauge } from "../components/common/RiskGauge";

export const AlertDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      ApiService.getAlert(id)
        .then((res) => setAlert(res.data))
        .catch((err) => console.error("Failed to load alert", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const res = await ApiService.updateAlert(id, { status: newStatus });
      setAlert(res.data);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading alert details...</div>;
  }

  if (!alert) {
    return <div className="p-12 text-center text-red-400 font-mono text-xs">Alert not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/alerts")}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Alerts Queue
        </button>

        <div className="flex items-center gap-3">
          {alert.incident_id && (
            <button
              onClick={() => navigate(`/incidents/${alert.incident_id}`)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30"
            >
              <ExternalLink className="w-4 h-4" /> View Correlated Incident
            </button>
          )}
        </div>
      </div>

      {/* Main Alert Card */}
      <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={alert.severity} size="md" />
              <MitreTag
                techniqueId={alert.mitre_technique_id}
                techniqueName={alert.mitre_technique_name}
                tactic={alert.mitre_tactic}
              />
              <span className="text-xs font-mono text-slate-400 bg-[#09090b] px-2 py-0.5 rounded border border-slate-800/60">
                {alert.rule_id}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white font-mono pt-1">{alert.title}</h1>
            <p className="text-xs text-slate-400">{alert.description}</p>
          </div>

          <RiskGauge score={alert.severity === "critical" ? 92 : alert.severity === "high" ? 78 : 50} />
        </div>

        {/* Entity Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Target Host</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Server className="w-3.5 h-3.5 text-pink-400" />
              {alert.affected_hosts[0] || "lab-linux-01"}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Adversary Source IP</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400">
              <Globe className="w-3.5 h-3.5" />
              {alert.source_ips[0] || "10.10.10.50"}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Target Account</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400">
              <UserIcon className="w-3.5 h-3.5" />
              {alert.target_users[0] || "root"}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Triage Status</span>
            <select
              value={alert.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-pink-400 focus:outline-none"
            >
              <option value="NEW">NEW</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommended Investigation Steps & Playbook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-3">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-pink-400" /> Recommended Investigation Steps
          </h3>
          <ul className="space-y-2 text-xs text-slate-300 font-mono">
            <li className="p-2.5 rounded-lg bg-[#09090b]/60 border border-slate-800/60 flex items-start gap-2">
              <span className="text-pink-400 font-bold">1.</span>
              <span>Search telemetry stream for additional requests originating from IP <strong>{alert.source_ips[0] || "10.10.10.50"}</strong>.</span>
            </li>
            <li className="p-2.5 rounded-lg bg-[#09090b]/60 border border-slate-800/60 flex items-start gap-2">
              <span className="text-pink-400 font-bold">2.</span>
              <span>Review subsequent process executions spawned on <strong>{alert.affected_hosts[0] || "lab-linux-01"}</strong>.</span>
            </li>
            <li className="p-2.5 rounded-lg bg-[#09090b]/60 border border-slate-800/60 flex items-start gap-2">
              <span className="text-pink-400 font-bold">3.</span>
              <span>Extract hashes and IPs, verify against Local Threat Intelligence provider.</span>
            </li>
            <li className="p-2.5 rounded-lg bg-[#09090b]/60 border border-slate-800/60 flex items-start gap-2">
              <span className="text-pink-400 font-bold">4.</span>
              <span>Execute containment playbook action: apply perimeter firewall drop rule.</span>
            </li>
          </ul>
        </div>

        {/* Sample Trigger Events */}
        <div className="p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-3">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-purple-400" /> Sample Telemetry Events
          </h3>
          <div className="bg-slate-950 p-3 rounded-3xl border border-slate-800/60 overflow-x-auto text-[11px] font-mono text-pink-300 max-h-48">
            <pre>{JSON.stringify(alert.sample_events || [], null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

