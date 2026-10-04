import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  FolderGit2,
  Flame,
  ShieldCheck,
  Clock,
  Crosshair,
  TrendingUp,
  Server,
  Terminal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { ApiService } from "../services/api";
import { DashboardSummary } from "../types";
import { SeverityBadge } from "../components/common/SeverityBadge";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [severityData, setSeverityData] = useState<{ alerts: any[]; incidents: any[] }>({ alerts: [], incidents: [] });
  const [mitreData, setMitreData] = useState<any[]>([]);
  const [topAssets, setTopAssets] = useState<{ top_hosts: any[]; top_source_ips: any[] }>({ top_hosts: [], top_source_ips: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const [sumRes, timeRes, sevRes, mitreRes, assetsRes] = await Promise.all([
        ApiService.getDashboardSummary(),
        ApiService.getDashboardTimeline(),
        ApiService.getSeverityBreakdown(),
        ApiService.getMitreDistribution(),
        ApiService.getTopAssets(),
      ]);

      setSummary(sumRes.data);
      setTimeline(timeRes.data);
      setSeverityData(sevRes.data);
      setMitreData(mitreRes.data);
      setTopAssets(assetsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, []);

  const SEV_COLORS: Record<string, string> = {
    Critical: "#f43f5e",
    High: "#ec4899",
    Medium: "#d946ef",
    Low: "#a855f7",
    Info: "#8b5cf6",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#120f1c] via-[#1a142c] to-[#120f1c] p-6 rounded-3xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse shadow-[0_0_8px_#f472b6]" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-pink-400">
              Nexus Core • Live Feed
            </span>
          </div>
          <h2 className="text-2xl font-black font-sans tracking-tight text-white">
            AegisSim Central Nexus
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Continuous threat stream analysis, dynamic logic evaluation, and crisis response matrix.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/simulations")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Initiate Red Team Ops</span>
          </button>
          <button
            onClick={() => navigate("/training")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-3xl bg-[#09090b] hover:bg-[#12121a] border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Crosshair className="w-4 h-4" />
            <span>Defender Trials</span>
          </button>
        </div>
      </div>

      {/* Top 8 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 flex items-center justify-between hover:border-pink-500/50 transition-colors">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Raw Telemetry Count</p>
            <h3 className="text-2xl font-black font-sans text-white mt-1">
              {summary?.total_events.toLocaleString() || "..."}
            </h3>
            <span className="text-[10px] text-pink-400 font-mono flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Live Data Stream
            </span>
          </div>
          <div className="p-3 rounded-3xl bg-pink-950/40 border border-pink-500/20 text-pink-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 flex items-center justify-between hover:border-purple-500/50 transition-colors">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Active Threat Warnings</p>
            <h3 className="text-2xl font-black font-sans text-white mt-1">
              {summary?.total_alerts.toLocaleString() || "..."}
            </h3>
            <span className="text-[10px] text-purple-400 font-mono">
              {summary?.high_alerts || 0} High • {summary?.critical_alerts || 0} Critical
            </span>
          </div>
          <div className="p-3 rounded-3xl bg-purple-950/40 border border-purple-500/20 text-purple-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 flex items-center justify-between hover:border-indigo-500/50 transition-colors">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Ongoing Crisis Response</p>
            <h3 className="text-2xl font-black font-sans text-white mt-1">
              {summary?.open_incidents || "..."}
            </h3>
            <span className="text-[10px] text-indigo-400 font-mono">
              Avg Risk: {summary?.average_risk_score || 0}/100
            </span>
          </div>
          <div className="p-3 rounded-3xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-400">
            <FolderGit2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 flex items-center justify-between hover:border-fuchsia-500/50 transition-colors">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Defense Efficiency</p>
            <h3 className="text-2xl font-black font-sans text-fuchsia-400 mt-1">
              {summary?.detection_rate || 0}%
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Noise Rate: {summary?.false_positive_rate || 0}%
            </span>
          </div>
          <div className="p-3 rounded-3xl bg-fuchsia-950/40 border border-fuchsia-500/20 text-fuchsia-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60/50 flex items-center gap-3">
          <Clock className="w-4 h-4 text-pink-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono">Avg Response Delay</span>
            <p className="text-sm font-bold font-sans text-slate-200">{summary?.mtta_minutes || 4.2} mins</p>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60/50 flex items-center gap-3">
          <Clock className="w-4 h-4 text-purple-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono">Avg Neutralization Time</span>
            <p className="text-sm font-bold font-sans text-slate-200">{summary?.mttr_minutes || 28.5} mins</p>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60/50 flex items-center gap-3">
          <Server className="w-4 h-4 text-indigo-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono">Secured Endpoints</span>
            <p className="text-sm font-bold font-sans text-slate-200">5 Active Nodes</p>
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-[#09090b] border border-slate-800/60/50 flex items-center gap-3">
          <Flame className="w-4 h-4 text-fuchsia-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono">Red Ops Deployed</span>
            <p className="text-sm font-bold font-sans text-slate-200">{summary?.active_scenarios || 0} Missions</p>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time-Series Telemetry (Events & Alerts over time) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-slate-200">
                Telemetry vs Threat Warnings Matrix
              </h3>
              <p className="text-xs text-slate-400 font-mono">Raw ingested data points vs correlated threat spikes</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-pink-400">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400" /> Data Streams
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Warnings
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a1f3d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#2a1f3d", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="events" stroke="#f472b6" strokeWidth={2} fillOpacity={1} fill="url(#eventGradient)" />
                <Area type="monotone" dataKey="alerts" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#alertGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Donut */}
        <div className="p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-slate-200">
              Warning Impact Distribution
            </h3>
            <p className="text-xs text-slate-400 font-mono">By threat magnitude</p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData.alerts}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.alerts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEV_COLORS[entry.name] || "#3b82f6"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f141f", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs">
            {severityData.alerts.slice(0, 3).map((item) => (
              <div key={item.name} className="flex flex-col">
                <span className="text-slate-400 text-[10px] uppercase">{item.name}</span>
                <span className="font-mono font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MITRE & Top Attacked Assets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MITRE ATT&CK Tactic Distribution */}
        <div className="p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-slate-200">
                Tactics Matrix Profiling
              </h3>
              <p className="text-xs text-slate-400 font-mono">Adversary behaviors mapped against the matrix</p>
            </div>
            <button
              onClick={() => navigate("/coverage")}
              className="text-xs text-pink-400 hover:underline font-mono"
            >
              View Matrix &rarr;
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mitreData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tactic" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f141f", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Attacked Hosts & Top Source IPs */}
        <div className="p-5 rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-slate-200">
              Primary Vectors & Adversaries
            </h3>
            <p className="text-xs text-slate-400 font-mono">Highest-density threat nodes</p>
          </div>

          <div className="grid grid-cols-2 gap-4 my-3">
            {/* Top Hosts */}
            <div>
              <p className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Top Targeted Hosts</p>
              <div className="space-y-2">
                {topAssets.top_hosts.map((h, i) => (
                  <div
                    key={h.host}
                    onClick={() => navigate(`/events?host=${encodeURIComponent(h.host)}`)}
                    className="p-2 rounded bg-[#09090b] hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-slate-200">{h.host}</span>
                    <span className="font-mono font-bold text-pink-400">{h.count} ev</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Source IPs */}
            <div>
              <p className="text-xs font-mono uppercase text-slate-400 mb-2 font-semibold">Top Source IPs</p>
              <div className="space-y-2">
                {topAssets.top_source_ips.map((ip, i) => (
                  <div
                    key={ip.ip}
                    onClick={() => navigate(`/events?source_ip=${encodeURIComponent(ip.ip)}`)}
                    className="p-2 rounded bg-[#09090b] hover:bg-slate-800 border border-slate-800/60 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-mono text-purple-400">{ip.ip}</span>
                    <span className="font-mono font-bold text-pink-400">{ip.count} ev</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Live synchronization active</span>
            <button
              onClick={() => navigate("/hunting")}
              className="text-xs font-bold text-pink-400 hover:underline flex items-center gap-1"
            >
              <Crosshair className="w-3.5 h-3.5" /> Engage Adversary Pursuit &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

