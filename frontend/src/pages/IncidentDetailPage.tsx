import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FolderGit2,
  ArrowLeft,
  Clock,
  Shield,
  FileText,
  Lock,
  Download,
  Send,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldAlert,
  Server,
  User,
  Globe,
  Hash,
  X,
} from "lucide-react";
import { ApiService } from "../services/api";
import { Incident, Alert } from "../types";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { RiskGauge } from "../components/common/RiskGauge";
import { MitreTag } from "../components/common/MitreTag";

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"timeline" | "alerts" | "evidence" | "notes" | "playbook">("timeline");
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);

  // Evidence modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState("log");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceRaw, setEvidenceRaw] = useState("");

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState("MARKDOWN");
  const [generatedReport, setGeneratedReport] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const navigate = useNavigate();

  const loadIncidentData = async () => {
    if (!id) return;
    try {
      const [incRes, timeRes] = await Promise.all([
        ApiService.getIncident(id),
        ApiService.getIncidentTimeline(id),
      ]);
      setIncident(incRes.data);
      setTimelineItems(timeRes.data);
    } catch (err) {
      console.error("Failed to load incident", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentData();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const res = await ApiService.updateIncident(id, { status: newStatus });
      setIncident((prev) => prev ? { ...prev, status: res.data.status } : null);
    } catch (err) {
      console.error("Failed to update incident status", err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteText.trim()) return;
    try {
      await ApiService.addInvestigationNote(id, noteText.trim());
      setNoteText("");
      loadIncidentData();
    } catch (err) {
      console.error("Failed to add note", err);
    }
  };

  const handleAddEvidence = async () => {
    if (!id || !evidenceDesc.trim()) return;
    try {
      await ApiService.addEvidence(id, {
        evidence_type: evidenceType,
        description: evidenceDesc,
        raw_text: evidenceRaw || evidenceDesc,
      });
      setShowEvidenceModal(false);
      setEvidenceDesc("");
      setEvidenceRaw("");
      loadIncidentData();
    } catch (err) {
      console.error("Failed to add evidence", err);
    }
  };

  const handleExecuteAction = async (actionType: string, target: string, desc: string) => {
    if (!id) return;
    try {
      await ApiService.executeResponseAction(id, {
        action_type: actionType,
        target_identifier: target,
        description: desc,
      });
      loadIncidentData();
    } catch (err) {
      console.error("Failed to execute action", err);
    }
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    setGeneratingReport(true);
    try {
      const res = await ApiService.generateReport(id, reportFormat);
      setGeneratedReport(res.data);
    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReportFile = () => {
    if (!generatedReport) return;
    const content = typeof generatedReport.rendered_content === "string"
      ? generatedReport.rendered_content
      : JSON.stringify(generatedReport.rendered_content, null, 2);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident_report_${incident?.id.substring(0, 8)}.${reportFormat.toLowerCase()}`;
    a.click();
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading investigation workbench...</div>;
  }

  if (!incident) {
    return <div className="p-12 text-center text-red-400 font-mono text-xs">Incident not found.</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => navigate("/incidents")}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Incidents
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Generate Incident Report
          </button>
          <button
            onClick={() => setShowEvidenceModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Collect Evidence
          </button>
        </div>
      </div>

      {/* Incident Header Overview Card */}
      <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/60/80 pb-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={incident.severity} size="md" />
              <span className="text-xs font-mono text-pink-400 bg-pink-950/80 border border-pink-500/30 px-2 py-0.5 rounded font-bold">
                {incident.correlation_id || `INC-${incident.id.substring(0, 8)}`}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  incident.containment_status === "CONTAINED"
                    ? "bg-purple-950 text-purple-400 border border-purple-500/30"
                    : "bg-rose-950 text-rose-400 border border-rose-500/30"
                }`}
              >
                {incident.containment_status}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white font-mono">{incident.title}</h1>
            <p className="text-xs text-slate-400">{incident.description}</p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <RiskGauge score={incident.risk_score} size="lg" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase text-slate-400 mb-1">Status Workflow</span>
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-[#09090b] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="CONTAINED">CONTAINED</option>
                <option value="ERADICATION">ERADICATION</option>
                <option value="RECOVERY">RECOVERY</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Entity Highlights & Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Affected Assets</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Server className="w-3.5 h-3.5 text-pink-400" />
              {incident.affected_assets.join(", ") || "lab-linux-01"}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Adversary Indicators (IOCs)</span>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400">
              <Globe className="w-3.5 h-3.5" />
              {incident.indicators.join(", ") || "10.10.10.50"}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">MITRE Kill Chain</span>
            <div className="flex flex-wrap gap-1 text-[10px] font-mono text-purple-300">
              {incident.mitre_techniques.map((m, i) => (
                <span key={i} className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/30">
                  {m.technique_id}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-3xl bg-[#09090b]/80 border border-slate-800/60">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Created / Updated</span>
            <span className="text-xs font-mono text-slate-300">
              {new Date(incident.updated_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2 overflow-x-auto">
        {[
          { key: "timeline", label: `Timeline (${timelineItems.length})`, icon: Clock },
          { key: "alerts", label: `Alerts (${incident.alerts?.length || 0})`, icon: AlertTriangle },
          { key: "evidence", label: `Evidence Vault (${incident.evidence_items?.length || 0})`, icon: Hash },
          { key: "notes", label: `Analyst Notes (${incident.investigation_notes?.length || 0})`, icon: FileText },
          { key: "playbook", label: `Containment Actions (${incident.response_actions?.length || 0})`, icon: Shield },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-3xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-[#09090b] text-slate-400 hover:text-slate-200 border border-slate-800/60"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Chronological Unified Timeline */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Unified Chronological Incident Timeline
            </h3>
            <span className="text-xs font-mono text-slate-400">Sequential Telemetry & SOC Actions</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timelineItems.map((item, idx) => (
              <div key={idx} className="relative group">
                <div
                  className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#141b2a] ${
                    item.item_type === "ALERT"
                      ? "bg-rose-500 shadow-[0_0_8px_#f97316]"
                      : item.item_type === "RESPONSE_ACTION"
                      ? "bg-purple-500 shadow-[0_0_8px_#10b981]"
                      : item.item_type === "NOTE"
                      ? "bg-pink-500"
                      : item.item_type === "EVIDENCE"
                      ? "bg-purple-500"
                      : "bg-slate-600"
                  }`}
                />

                <div className="p-4 rounded-3xl bg-[#09090b]/80 border border-slate-800/60 hover:border-slate-700 transition-colors space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.item_type === "ALERT"
                            ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                            : item.item_type === "RESPONSE_ACTION"
                            ? "bg-purple-950 text-purple-400 border border-purple-500/30"
                            : item.item_type === "NOTE"
                            ? "bg-pink-950 text-pink-400 border border-pink-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.item_type}
                      </span>
                      <strong className="text-white">{item.title}</strong>
                    </div>
                    <span className="text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono">{item.description}</p>

                  {(item.mitre_technique_id || item.host || item.source_ip) && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                      {item.mitre_technique_id && (
                        <MitreTag techniqueId={item.mitre_technique_id} tactic={item.mitre_tactic} />
                      )}
                      {item.host && <span>Host: {item.host}</span>}
                      {item.source_ip && <span className="text-red-400">IP: {item.source_ip}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Correlated Alerts */}
      {activeTab === "alerts" && (
        <div className="space-y-3">
          {(incident.alerts || []).map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/alerts/${a.id}`)}
              className="p-4 rounded-3xl bg-[#0e0c15] hover:bg-slate-800/60 border border-slate-800/60 cursor-pointer flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={a.severity} size="sm" />
                  <MitreTag techniqueId={a.mitre_technique_id} tactic={a.mitre_tactic} />
                  <span className="text-xs font-mono text-slate-400 font-bold">{a.rule_id}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-200">{a.title}</h4>
                <p className="text-xs text-slate-400">{a.description}</p>
              </div>
              <span className="text-xs font-mono text-pink-400">&rarr; View Alert</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Evidence Vault */}
      {activeTab === "evidence" && (
        <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
                Cryptographic Evidence Vault & Chain of Custody
              </h3>
              <p className="text-xs text-slate-400">Immutable records with verified SHA-256 digests</p>
            </div>
            <button
              onClick={() => setShowEvidenceModal(true)}
              className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold font-mono"
            >
              + Collect Evidence
            </button>
          </div>

          <div className="space-y-3">
            {(incident.evidence_items || []).map((ev) => (
              <div key={ev.id} className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase font-bold text-[10px]">
                    {ev.evidence_type}
                  </span>
                  <span className="text-slate-400">{new Date(ev.collected_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-200">{ev.description}</p>
                <div className="p-2 rounded bg-slate-950 border border-slate-800/60 flex items-center justify-between text-[11px] text-pink-400">
                  <div className="flex items-center gap-2 truncate">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">SHA-256: {ev.sha256_hash}</span>
                  </div>
                  <span className="text-[10px] text-purple-400 uppercase font-bold shrink-0 ml-2">VERIFIED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Analyst Notes */}
      {activeTab === "notes" && (
        <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
            Analyst Collaboration & Investigation Notes
          </h3>

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record investigation findings, threat actor hypotheses, containment plans..."
              className="w-full bg-[#09090b] border border-slate-700 rounded-3xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-3xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-600/30"
            >
              <Send className="w-3.5 h-3.5" /> Post Investigation Note
            </button>
          </form>

          <div className="space-y-3 pt-4 border-t border-slate-800/60">
            {(incident.investigation_notes || []).map((n) => (
              <div key={n.id} className="p-3.5 rounded-3xl bg-[#09090b] border border-slate-800/60 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-pink-400">@{n.author_username}</span>
                  <span className="text-slate-400 text-[10px]">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap">{n.note_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Response Playbooks & Containment Actions */}
      {activeTab === "playbook" && (
        <div className="p-6 rounded-3xl bg-[#0e0c15] border border-slate-800/60 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Defensive Containment Actions & Playbook Execution
            </h3>
            <p className="text-xs text-slate-400">Trigger isolated containment controls against lab targets</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold font-mono text-red-400">1. Block Adversary Source IP</h4>
                <p className="text-[11px] text-slate-400 mt-1">Inserts perimeter firewall rule to drop socket traffic from 10.10.10.50.</p>
              </div>
              <button
                onClick={() => handleExecuteAction("block_ip", incident.indicators[0] || "10.10.10.50", "Firewall drop rule applied")}
                className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-lg shadow-red-900/30 cursor-pointer"
              >
                Execute IP Block
              </button>
            </div>

            <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold font-mono text-rose-400">2. Isolate Compromised Host</h4>
                <p className="text-[11px] text-slate-400 mt-1">Disconnects lab host from local network interfaces to stop lateral movement.</p>
              </div>
              <button
                onClick={() => handleExecuteAction("isolate_host", incident.affected_assets[0] || "lab-linux-01", "Host isolated on virtual interface")}
                className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-900/30 cursor-pointer"
              >
                Execute Host Quarantine
              </button>
            </div>

            <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold font-mono text-purple-400">3. Reset Target Account</h4>
                <p className="text-[11px] text-slate-400 mt-1">Forces session termination and password reset for compromised user account.</p>
              </div>
              <button
                onClick={() => handleExecuteAction("disable_user", "root", "User credentials rotated and session purged")}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-900/30 cursor-pointer"
              >
                Rotate Credentials
              </button>
            </div>
          </div>

          {/* Action Log History */}
          <div className="pt-4 border-t border-slate-800/60">
            <h4 className="text-xs font-mono uppercase text-slate-400 mb-3 font-semibold">Executed Response History</h4>
            <div className="space-y-2">
              {(incident.response_actions || []).map((act) => (
                <div key={act.id} className="p-3 rounded-lg bg-[#09090b]/60 border border-slate-800/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-200">{act.action_type}</span>
                    <span className="text-slate-400">&rarr; {act.target_identifier}</span>
                  </div>
                  <span className="text-[10px] text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30 font-bold">
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collect Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0c15] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-bold text-base text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-pink-400" /> Collect & Hash Evidence
              </h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-[#09090b] border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200"
              >
                <option value="log">Log File Snippet</option>
                <option value="ioc">Indicator of Compromise</option>
                <option value="event">Normalized Telemetry Event</option>
                <option value="screenshot">Screenshot / Memory Dump</option>
                <option value="analyst_note">Analyst Report Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={evidenceDesc}
                onChange={(e) => setEvidenceDesc(e.target.value)}
                placeholder="e.g., Auth log showing brute force origin"
                className="w-full bg-[#09090b] border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Raw Content / Text Payload</label>
              <textarea
                rows={4}
                value={evidenceRaw}
                onChange={(e) => setEvidenceRaw(e.target.value)}
                placeholder="Paste raw log lines, packet dump or IOC text here..."
                className="w-full bg-[#09090b] border border-slate-700 rounded-lg p-2 text-xs font-mono text-pink-300"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvidence}
                className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white shadow-lg shadow-pink-600/30"
              >
                Calculate Hash & Save Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0c15] border border-slate-700 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h3 className="font-mono font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-400" /> Executive Security Incident Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <label className="text-slate-300 font-bold">Export Format:</label>
              {["MARKDOWN", "JSON", "CSV"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setReportFormat(fmt)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    reportFormat === fmt ? "bg-pink-600 text-white" : "bg-[#09090b] text-slate-400 border border-slate-800/60"
                  }`}
                >
                  {fmt}
                </button>
              ))}
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold ml-auto"
              >
                {generatingReport ? "Compiling..." : "Generate Report"}
              </button>
            </div>

            {generatedReport && (
              <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-3xl border border-slate-800/60 text-xs font-mono text-pink-300">
                <pre className="whitespace-pre-wrap">
                  {typeof generatedReport.rendered_content === "string"
                    ? generatedReport.rendered_content
                    : JSON.stringify(generatedReport.rendered_content, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-[11px] font-mono text-slate-400">
                {generatedReport ? `Report ID: ${generatedReport.report_id}` : "Click Generate Report above"}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300"
                >
                  Close
                </button>
                {generatedReport && (
                  <button
                    onClick={downloadReportFile}
                    className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-pink-600/30"
                  >
                    <Download className="w-4 h-4" /> Download Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

