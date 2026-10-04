import React from "react";
import { ShieldAlert } from "lucide-react";

interface MitreTagProps {
  techniqueId: string;
  techniqueName?: string;
  tactic?: string;
}

export const MitreTag: React.FC<MitreTagProps> = ({ techniqueId, techniqueName, tactic }) => {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono bg-purple-950/50 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60 transition-colors cursor-pointer"
      title={tactic ? `MITRE Tactic: ${tactic} - ${techniqueName}` : techniqueName}
    >
      <ShieldAlert className="w-3 h-3 text-purple-400" />
      <span className="font-bold">{techniqueId}</span>
      {techniqueName && <span className="opacity-80 max-w-[120px] truncate">({techniqueName})</span>}
    </span>
  );
};

