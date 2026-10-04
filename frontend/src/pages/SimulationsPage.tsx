import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Terminal, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  ExternalLink, 
  Zap, 
  Layers, 
  Clock, 
  Crosshair,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { AttackScenario, SimulationResult } from '../types';
import MitreTag from '../components/MitreTag';
import { Link } from 'react-router-dom';

export default function SimulationsPage() {
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [activeSimulationResult, setActiveSimulationResult] = useState<SimulationResult | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    setIsLoading(true);
    try {
      const res = await api.simulations.getAll();
      setScenarios(res.data);
    } catch (err) {
      console.error('Failed to load attack scenarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSimulation = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    setActiveSimulationResult(null);
    setErrorMsg(null);
    setProgressStage('Initializing synthetic lab target & telemetry emitters...');

    try {
      setTimeout(() => setProgressStage('Executing synthetic attack stages against localhost...'), 400);
      setTimeout(() => setProgressStage('Normalizing emitted logs and evaluating detection rules...'), 900);
      setTimeout(() => setProgressStage('Correlating triggered alerts into incident workflow...'), 1400);

      const res = await api.simulations.run(scenarioId);
      
      setTimeout(() => {
        setActiveSimulationResult(res.data);
        setRunningScenarioId(null);
        setProgressStage('');
      }, 1600);
    } catch (err: any) {
      console.error('Simulation execution failed:', err);
      setErrorMsg(err?.response?.data?.detail || 'Simulation execution failed.');
      setRunningScenarioId(null);
      setProgressStage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-fuchsia-400" />
            Red Team Ops Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            Deploy synthetic adversary profiles against isolated infrastructure nodes to test SOC detection pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-pink-950/40 border border-pink-800/60 rounded-3xl text-xs font-mono text-pink-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            Status: ISOLATED NETWORK
          </div>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="p-4 bg-[#09090b] border border-slate-800/60/60 rounded-3xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed font-mono">
          <strong className="text-slate-200">Safe Defensive Simulation Notice:</strong> All operations generate synthetic telemetry directed solely toward localhost nodes. No destructive payloads or outbound network traffic are produced.
        </div>
      </div>

      {/* Progress Card when Running */}
      {runningScenarioId && (
        <div className="cyber-card p-6 border-fuchsia-500/50 bg-fuchsia-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-950 border border-fuchsia-800 flex items-center justify-center text-fuchsia-400 animate-spin">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Simulation in Progress: <span className="text-fuchsia-400">{runningScenarioId}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{progressStage}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full h-2 gap-[1px]">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-full ${
                  i < 75 ? 'bg-purple-500 shadow-[0_0_5px_#a855f7] animate-pulse' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Simulation Result Modal / Card */}
      {activeSimulationResult && (
        <div className="p-6 rounded-3xl border border-pink-500/50 bg-[#0e0c15] shadow-[0_0_30px_rgba(244,114,182,0.15)] space-y-5 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-3xl bg-pink-950/50 border border-pink-800 flex items-center justify-center text-pink-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-pink-400">MISSION ACCOMPLISHED</span>
                  <span className="text-xs text-slate-500">&bull;</span>
                  <span className="text-xs font-mono text-slate-400">{activeSimulationResult.scenario_id}</span>
                </div>
                <h2 className="text-lg font-bold text-white">{activeSimulationResult.scenario_name}</h2>
              </div>
            </div>

            {activeSimulationResult.incident_id && (
              <Link
                to={`/incidents/${activeSimulationResult.incident_id}`}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-3xl text-sm font-semibold transition-all shadow-lg shadow-purple-900/40"
              >
                Inspect Fallout <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Result Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Duration</div>
              <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">
                {activeSimulationResult.duration_seconds.toFixed(2)}s
              </div>
            </div>

            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Events Emitted</div>
              <div className="text-lg font-mono font-bold text-pink-400 mt-0.5">
                {activeSimulationResult.events_generated}
              </div>
            </div>

            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Detections</div>
              <div className="text-lg font-mono font-bold text-purple-400 mt-0.5">
                {activeSimulationResult.detections_triggered}
              </div>
            </div>

            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Warnings Raised</div>
              <div className="text-lg font-mono font-bold text-fuchsia-400 mt-0.5">
                {activeSimulationResult.alerts_generated}
              </div>
            </div>

            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Crises</div>
              <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">
                {activeSimulationResult.incidents_created}
              </div>
            </div>

            <div className="p-3 bg-[#09090b] rounded-3xl border border-slate-800/60/60 text-center">
              <div className="text-[11px] text-slate-400 uppercase">Impact Score</div>
              <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">
                {activeSimulationResult.risk_score} / 100
              </div>
            </div>
          </div>

          {/* Triggered Rules & MITRE Techniques */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-[#09090b] rounded-3xl border border-slate-800/60/60 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Defensive Rules Triggered
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeSimulationResult.rules_matched.map((r) => (
                  <span key={r} className="px-2 py-1 bg-[#120f1c] border border-slate-700/50 rounded text-xs font-mono text-purple-300">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#09090b] rounded-3xl border border-slate-800/60/60 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mapped Matrix Vectors
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeSimulationResult.mitre_techniques.map((t) => (
                  <MitreTag key={t} techniqueId={t} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full rounded-3xl bg-[#0e0c15] border border-slate-800/60/60 p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading mission profiles...
          </div>
        ) : (
          scenarios.map((scenario) => {
            const isCurrentlyRunning = runningScenarioId === scenario.id;
            return (
              <div 
                key={scenario.id} 
                className="rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-pink-500/30 transition-all border border-slate-800/60/60 bg-[#0e0c15]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-pink-400 bg-[#120f1c] px-3 py-1 rounded-lg border border-slate-800/60/50">
                      {scenario.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ~{scenario.stages?.length || 3} stages
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{scenario.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                      {scenario.description}
                    </p>
                  </div>

                  {/* Stages Pills */}
                  {scenario.stages && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                        Attack Stages Sequence
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {scenario.stages.map((st, i) => (
                          <span key={i} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded text-slate-300 font-mono border border-slate-800/60">
                            {typeof st === 'string' ? st : (st.name || 'Stage ' + (i + 1))}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expected MITRE Techniques */}
                  {scenario.expected_mitre && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                        Expected MITRE Techniques
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {scenario.expected_mitre.map((m) => (
                          <span key={m} className="text-[10px] bg-fuchsia-950/40 text-fuchsia-300 px-1.5 py-0.5 rounded font-mono border border-fuchsia-800/40">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-5 border-t border-slate-800/60/60">
                  <button
                    onClick={() => handleRunSimulation(scenario.id)}
                    disabled={runningScenarioId !== null}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-3xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 shadow-lg shadow-purple-900/30"
                  >
                    <Play className={`w-4 h-4 ${isCurrentlyRunning ? 'animate-spin' : ''}`} />
                    {isCurrentlyRunning ? 'Executing...' : 'Deploy Mission'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

