import React from "react";

interface RiskGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, size = "md", showLabel = true }) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const getColor = (s: number) => {
    if (s >= 90) return { bg: "bg-red-500", text: "text-red-400", border: "border-red-500", ring: "stroke-red-500", label: "Critical" };
    if (s >= 75) return { bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-500", ring: "stroke-rose-500", label: "High" };
    if (s >= 50) return { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500", ring: "stroke-yellow-500", label: "Medium" };
    if (s >= 25) return { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500", ring: "stroke-purple-500", label: "Low" };
    return { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500", ring: "stroke-purple-500", label: "Info" };
  };

  const style = getColor(clampedScore);

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex w-32 h-2 gap-[1px]">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-full ${
                i < clampedScore ? style.bg : "bg-slate-800"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-mono font-bold ${style.text}`}>{clampedScore}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1 w-48">
        <div className="flex w-full h-3 gap-[1px]">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-full ${
                i < clampedScore ? style.bg : "bg-slate-800"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm font-mono font-bold ${style.text}`}>Score: {clampedScore}/100</span>
          {showLabel && (
            <span className={`text-xs font-bold uppercase ${style.text}`}>{style.label}</span>
          )}
        </div>
      </div>
    </div>
  );
};

