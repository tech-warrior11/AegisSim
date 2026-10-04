import React, { useState, useEffect } from 'react';
import { 
  Award, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Target, 
  Terminal, 
  Send, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import SeverityBadge from '../components/SeverityBadge';
import RiskGauge from '../components/RiskGauge';

interface TrainingSubmission {
  initial_access_type: string;
  targeted_user: string;
  source_ip: string;
  post_auth_action: string;
  mitre_technique: string;
  containment_action: string;
  analyst_notes: string;
}

interface EvaluationResult {
  training_score: number;
  grade: string;
  breakdown: {
    question: string;
    submitted: string;
    expected: string;
    is_correct: boolean;
    points: number;
    explanation: string;
  }[];
  expected_investigation_path: string[];
}

export default function BlueTeamTrainingPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [form, setForm] = useState<TrainingSubmission>({
    initial_access_type: '',
    targeted_user: '',
    source_ip: '',
    post_auth_action: '',
    mitre_technique: '',
    containment_action: '',
    analyst_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await api.incidents.getAll({ limit: 10 });
      setIncidents(res.data.items || []);
      if (res.data.items && res.data.items.length > 0) {
        setSelectedIncident(res.data.items[0]);
      }
    } catch (err) {
      console.error('Failed to load training incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setIsSubmitting(true);
    try {
      const res = await api.incidents.evaluateTraining(selectedIncident.incident_id, form);
      setEvaluation(res.data);
    } catch (err) {
      console.error('Training evaluation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEvaluation(null);
    setForm({
      initial_access_type: '',
      targeted_user: '',
      source_ip: '',
      post_auth_action: '',
      mitre_technique: '',
      containment_action: '',
      analyst_notes: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-fuchsia-400" />
            Blue Team Analyst Training Simulator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Perform blind incident triage, analyze security artifacts, and submit findings to receive an objective Training Score and remediation walkthrough.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-fuchsia-950/40 border border-fuchsia-800/60 rounded-lg text-xs font-semibold text-fuchsia-300">
            Training & Competency Evaluation Mode
          </div>
        </div>
      </div>

      {/* Incident Selection Bar */}
      <div className="cyber-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Training Case:</span>
        <div className="flex flex-wrap gap-2">
          {incidents.slice(0, 5).map((inc) => (
            <button
              key={inc.incident_id}
              onClick={() => {
                setSelectedIncident(inc);
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedIncident?.incident_id === inc.incident_id
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-950'
                  : 'bg-[#09090b] text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/60'
              }`}
            >
              {inc.incident_id} ({inc.severity})
            </button>
          ))}
        </div>
      </div>

      {selectedIncident && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incident Telemetry Context (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="cyber-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-pink-400">{selectedIncident.incident_id}</span>
                  <SeverityBadge severity={selectedIncident.severity} size="sm" />
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Risk: <strong className="text-rose-400">{selectedIncident.risk_score}</strong>/100
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Redacted / Observed Indicators */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Telemetry Clues for Investigation
                </h4>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/60 font-mono text-xs space-y-1.5 text-slate-300">
                  <div>Affected Asset: <span className="text-pink-300">{selectedIncident.affected_assets?.join(', ') || 'lab-linux-01'}</span></div>
                  <div>Correlation Window: <span className="text-slate-400">Past 15 minutes</span></div>
                  <div>Alert Count: <span className="text-fuchsia-400">{selectedIncident.alerts?.length || 3} correlated alerts</span></div>
                  <div>Observed Indicators: <span className="text-slate-400">{selectedIncident.indicators?.slice(0, 3).join(', ') || 'Confidential'}</span></div>
                </div>
              </div>

              <div className="p-3 bg-pink-950/30 border border-pink-800/40 rounded-lg text-xs text-pink-200">
                💡 <strong>Analyst Task:</strong> Review the clues above and your knowledge of SOC triage procedures to reconstruct the attack lifecycle.
              </div>
            </div>
          </div>

          {/* Training Questionnaire / Evaluation Report (7 Cols) */}
          <div className="lg:col-span-7">
            {evaluation ? (
              /* Score & Evaluation Breakdown */
              <div className="cyber-card p-6 space-y-6 animate-in fade-in border-purple-500/40">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                  <div>
                    <div className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider">
                      Evaluation Complete
                    </div>
                    <h2 className="text-2xl font-bold text-white">Training Scorecard</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase">Grade</div>
                      <div className="text-xl font-bold text-pink-400 font-mono">{evaluation.grade}</div>
                    </div>
                    <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-pink-500 flex items-center justify-center text-xl font-mono font-black text-pink-300">
                      {evaluation.training_score}
                    </div>
                  </div>
                </div>

                {/* Questions Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                    Investigation Questions Evaluation
                  </h3>

                  {evaluation.breakdown.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border text-xs space-y-2 ${
                        item.is_correct 
                          ? 'bg-purple-950/20 border-purple-800/60 text-purple-200' 
                          : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          {item.is_correct ? (
                            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          {item.question}
                        </div>
                        <span className="font-mono font-bold">
                          +{item.points} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                        <div>Submitted: <span className="text-slate-300">{item.submitted || '(Blank)'}</span></div>
                        <div>Expected: <span className="text-pink-300">{item.expected}</span></div>
                      </div>

                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60/60">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Expected Investigation Path */}
                {evaluation.expected_investigation_path && (
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4 text-pink-400" />
                      Expected Ground Truth Incident Path
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400 font-mono">
                      {evaluation.expected_investigation_path.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" /> Try Another Training Scenario
                  </button>
                </div>
              </div>
            ) : (
              /* Questionnaire Form */
              <form onSubmit={handleSubmitEvaluation} className="cyber-card p-6 space-y-5">
                <div className="border-b border-slate-800/60 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-pink-400" />
                    Analyst Investigation Submission Form
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Answer all 6 defensive triage questions below based on your analysis of the incident.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Q1 */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      1. Initial Access / Vector
                    </label>
                    <input
                      type="text"
                      value={form.initial_access_type}
                      onChange={(e) => setForm({ ...form, initial_access_type: e.target.value })}
                      placeholder="e.g. SSH Password Spraying / SQL Injection"
                      className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  {/* Q2 & Q3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        2. Target Account / User
                      </label>
                      <input
                        type="text"
                        value={form.targeted_user}
                        onChange={(e) => setForm({ ...form, targeted_user: e.target.value })}
                        placeholder="e.g. root / admin / testuser"
                        className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        3. Threat Source IP
                      </label>
                      <input
                        type="text"
                        value={form.source_ip}
                        onChange={(e) => setForm({ ...form, source_ip: e.target.value })}
                        placeholder="e.g. 192.168.1.150"
                        className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Q4 & Q5 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        4. Post-Authentication Activity
                      </label>
                      <input
                        type="text"
                        value={form.post_auth_action}
                        onChange={(e) => setForm({ ...form, post_auth_action: e.target.value })}
                        placeholder="e.g. Sudo privilege escalation / shell execution"
                        className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        5. Primary MITRE ATT&CK Technique
                      </label>
                      <input
                        type="text"
                        value={form.mitre_technique}
                        onChange={(e) => setForm({ ...form, mitre_technique: e.target.value })}
                        placeholder="e.g. T1110 / T1059 / T1068"
                        className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Q6 */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      6. Containment / Remediation Playbook Action
                    </label>
                    <input
                      type="text"
                      value={form.containment_action}
                      onChange={(e) => setForm({ ...form, containment_action: e.target.value })}
                      placeholder="e.g. Isolate host, block IP on firewall, rotate root credentials"
                      className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      7. Analyst Conclusion Notes
                    </label>
                    <textarea
                      value={form.analyst_notes}
                      onChange={(e) => setForm({ ...form, analyst_notes: e.target.value })}
                      rows={2}
                      placeholder="Summary of investigation findings and timeline confirmation..."
                      className="w-full bg-slate-950 border border-slate-800/60 rounded p-2.5 text-slate-200 text-xs focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-fuchsia-950/40 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Evaluating Submission...' : 'Submit Investigation for Evaluation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

