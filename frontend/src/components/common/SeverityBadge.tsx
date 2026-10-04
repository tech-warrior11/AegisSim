import React from "react";

interface SeverityBadgeProps {
  severity: string;
  size?: "sm" | "md" | "lg";
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = "md" }) => {
  const sev = (severity || "low").toLowerCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-semibold",
    lg: "px-3 py-1.5 text-sm font-bold",
  }[size];

  const colorClasses = {
    critical: "bg-red-950/70 text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]",
    high: "bg-rose-950/70 text-rose-400 border border-rose-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    medium: "bg-yellow-950/70 text-yellow-400 border border-yellow-500/40",
    low: "bg-purple-950/70 text-purple-400 border border-purple-500/40",
    info: "bg-slate-800/80 text-slate-300 border border-slate-600/40",
  }[sev] || "bg-slate-800 text-slate-300 border border-slate-700";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full uppercase tracking-wider ${sizeClasses} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sev === 'critical' ? 'bg-red-400 animate-ping' : sev === 'high' ? 'bg-rose-400' : 'bg-current'}`} />
      {severity}
    </span>
  );
};

