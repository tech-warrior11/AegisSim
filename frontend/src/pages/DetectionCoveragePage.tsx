import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Grid, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ExternalLink,
  Info,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { DetectionRule, MitreCoverageItem } from '../types';
import MitreTag from '../components/MitreTag';

interface TacticGroup {
  tactic: string;
  techniques: {
    id: string;
    name: string;
    description: string;
    rules: string[];
    alertsCount: number;
    status: 'COVERED' | 'PARTIAL' | 'NOT_IMPLEMENTED';
  }[];
}

const MITRE_MATRIX_DATA: TacticGroup[] = [
  {
    tactic: 'Reconnaissance',
    techniques: [
      { id: 'T1595', name: 'Active Scanning', description: 'Port scanning & banner grabbing', rules: ['CR-NET-001'], alertsCount: 14, status: 'COVERED' },
      { id: 'T1592', name: 'Gather Victim Host Info', description: 'Identifying host OS and open services', rules: ['CR-NET-004'], alertsCount: 8, status: 'COVERED' },
      { id: 'T1589', name: 'Gather Victim Identity Info', description: 'Enumerating usernames and accounts', rules: [], alertsCount: 0, status: 'PARTIAL' },
    ]
  },
  {
    tactic: 'Initial Access',
    techniques: [
      { id: 'T1190', name: 'Exploit Public-Facing Application', description: 'SQL Injection, Path Traversal, XSS', rules: ['CR-WEB-001', 'CR-WEB-002', 'CR-WEB-003', 'CR-WEB-004'], alertsCount: 42, status: 'COVERED' },
      { id: 'T1078', name: 'Valid Accounts', description: 'Logins from unusual or untrusted IP addresses', rules: ['CR-AUTH-003'], alertsCount: 19, status: 'COVERED' },
      { id: 'T1566', name: 'Phishing', description: 'Spearphishing attachment or links', rules: [], alertsCount: 0, status: 'NOT_IMPLEMENTED' },
    ]
  },
  {
    tactic: 'Execution',
    techniques: [
      { id: 'T1059', name: 'Command & Scripting Interpreter', description: 'Suspicious shells (bash, powershell, cmd)', rules: ['CR-END-001', 'CR-END-003'], alertsCount: 31, status: 'COVERED' },
      { id: 'T1027', name: 'Obfuscated Files or Info', description: 'Base64 encoded commands and payloads', rules: ['CR-END-002'], alertsCount: 11, status: 'COVERED' },
      { id: 'T1106', name: 'Native API', description: 'Direct system call execution', rules: [], alertsCount: 0, status: 'PARTIAL' },
    ]
  },
  {
    tactic: 'Privilege Escalation',
    techniques: [
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', description: 'Sudo exploits and CVEs', rules: ['CR-PRIV-001', 'CR-PRIV-002'], alertsCount: 22, status: 'COVERED' },
      { id: 'T1078.003', name: 'Local Accounts Escalation', description: 'New root/admin account creation', rules: ['CR-PRIV-004'], alertsCount: 6, status: 'COVERED' },
      { id: 'T1548', name: 'Abuse Elevation Control', description: 'Sudo privilege abuse without password', rules: ['CR-PRIV-002'], alertsCount: 15, status: 'COVERED' },
    ]
  },
  {
    tactic: 'Credential Access',
    techniques: [
      { id: 'T1110', name: 'Brute Force', description: 'Password spraying and repeated auth failures', rules: ['CR-AUTH-001', 'CR-AUTH-004'], alertsCount: 68, status: 'COVERED' },
      { id: 'T1003', name: 'OS Credential Dumping', description: 'Accessing /etc/shadow or SAM registry', rules: ['CR-PRIV-003'], alertsCount: 9, status: 'COVERED' },
      { id: 'T1555', name: 'Credentials from Password Stores', description: 'Extracting saved credentials', rules: [], alertsCount: 0, status: 'NOT_IMPLEMENTED' },
    ]
  },
  {
    tactic: 'Discovery',
    techniques: [
      { id: 'T1046', name: 'Network Service Scanning', description: 'Connecting across internal subnets', rules: ['CR-NET-001', 'CR-NET-002'], alertsCount: 18, status: 'COVERED' },
      { id: 'T1083', name: 'File and Directory Discovery', description: 'Probing hidden configuration files', rules: ['CR-WEB-004'], alertsCount: 25, status: 'COVERED' },
      { id: 'T1057', name: 'Process Discovery', description: 'Enumerating running services', rules: ['CR-END-004'], alertsCount: 7, status: 'COVERED' },
    ]
  },
  {
    tactic: 'Exfiltration',
    techniques: [
      { id: 'T1041', name: 'Exfiltration Over C2 Channel', description: 'Large outbound TCP/UDP data transfer', rules: ['CR-NET-003'], alertsCount: 16, status: 'COVERED' },
      { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', description: 'DNS tunneling or ICMP payload transfer', rules: ['CR-NET-004'], alertsCount: 12, status: 'COVERED' },
    ]
  }
];

export default function DetectionCoveragePage() {
  const [selectedTech, setSelectedTech] = useState<any>(null);

  const totalTechniques = MITRE_MATRIX_DATA.reduce((acc, t) => acc + t.techniques.length, 0);
  const coveredTechniques = MITRE_MATRIX_DATA.reduce((acc, t) => 
    acc + t.techniques.filter(tech => tech.status === 'COVERED').length, 0
  );
  const coveragePercent = Math.round((coveredTechniques / totalTechniques) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-pink-400" />
            MITRE ATT&CK® Detection Coverage
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tactical mapping of detection engineering rules, telemetry ingestion points, and historical triggers across enterprise threat models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-950/60 border border-purple-800 rounded-lg text-xs font-semibold text-purple-300">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            Coverage Rate: {coveragePercent}%
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-3xl bg-pink-950/80 border border-pink-800 flex items-center justify-center text-pink-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Tactics Mapped</div>
            <div className="text-2xl font-bold text-white">{MITRE_MATRIX_DATA.length}</div>
          </div>
        </div>

        <div className="cyber-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-3xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Covered Techniques</div>
            <div className="text-2xl font-bold text-purple-400">{coveredTechniques} / {totalTechniques}</div>
          </div>
        </div>

        <div className="cyber-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-3xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Active Sigma Rules</div>
            <div className="text-2xl font-bold text-purple-400">21 Rules</div>
          </div>
        </div>

        <div className="cyber-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-3xl bg-fuchsia-950/80 border border-fuchsia-800 flex items-center justify-center text-fuchsia-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Simulated Triggers</div>
            <div className="text-2xl font-bold text-fuchsia-400">320+ Alerts</div>
          </div>
        </div>
      </div>

      {/* Interactive MITRE Matrix */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Grid className="w-4 h-4 text-pink-400" />
            Enterprise Attack Matrix Navigator
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
              <span className="text-slate-300">Covered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-fuchsia-500 inline-block" />
              <span className="text-slate-300">Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
              <span className="text-slate-300">Planned</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 overflow-x-auto pb-2">
          {MITRE_MATRIX_DATA.map((tacticGroup) => (
            <div key={tacticGroup.tactic} className="space-y-3 min-w-[160px]">
              <div className="p-2.5 bg-slate-950 border-b-2 border-pink-500 rounded text-center">
                <h3 className="text-xs font-bold text-slate-200 truncate uppercase tracking-wider">
                  {tacticGroup.tactic}
                </h3>
              </div>

              <div className="space-y-2">
                {tacticGroup.techniques.map((tech) => {
                  const isSelected = selectedTech?.id === tech.id;
                  let statusBg = 'bg-[#09090b]/60 border-slate-800/60 text-slate-400';
                  if (tech.status === 'COVERED') {
                    statusBg = 'bg-purple-950/40 border-purple-800/80 text-purple-300 hover:border-purple-500';
                  } else if (tech.status === 'PARTIAL') {
                    statusBg = 'bg-fuchsia-950/40 border-fuchsia-800/80 text-fuchsia-300 hover:border-fuchsia-500';
                  }

                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTech(tech)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${statusBg} ${
                        isSelected ? 'ring-2 ring-pink-400 scale-[1.02]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-[11px] text-pink-400">{tech.id}</span>
                        {tech.alertsCount > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-950/80 text-fuchsia-400 font-mono">
                            {tech.alertsCount}
                          </span>
                        )}
                      </div>
                      <div className="font-medium line-clamp-2 text-slate-200 text-[11px]">{tech.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        {tech.rules.length > 0 ? `${tech.rules.length} rule(s)` : 'No rules'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technique Drilldown Drawer / Card */}
      {selectedTech && (
        <div className="cyber-card p-6 space-y-4 border-pink-500/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-pink-400">{selectedTech.id}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  selectedTech.status === 'COVERED' ? 'bg-purple-950 text-purple-400 border border-purple-800' : 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-800'
                }`}>
                  {selectedTech.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{selectedTech.name}</h3>
            </div>

            <button
              onClick={() => setSelectedTech(null)}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              Close
            </button>
          </div>

          <p className="text-sm text-slate-300">{selectedTech.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Associated Defensive Rules ({selectedTech.rules.length})
              </h4>
              {selectedTech.rules.length === 0 ? (
                <p className="text-xs text-slate-500">No active detection rules mapped to this technique yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTech.rules.map((ruleId: string) => (
                    <span key={ruleId} className="px-2.5 py-1 bg-[#09090b] border border-slate-700 rounded text-xs font-mono text-pink-300">
                      {ruleId}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/60">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Observed Lab Telemetry Alerts
              </h4>
              <div className="text-2xl font-bold text-fuchsia-400 font-mono">
                {selectedTech.alertsCount} Alerts Triggered
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Validated during automated attack simulations and scenario playthroughs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

