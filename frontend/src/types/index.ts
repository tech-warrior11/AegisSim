export type UserRole = "ADMIN" | "SOC_ANALYST" | "VIEWER";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name?: string;
  is_active: boolean;
}

export interface SecurityEvent {
  id: string;
  event_id?: string;
  timestamp: string;
  source: string;
  host: string;
  event_type: string;
  action: string;
  user?: string | null;
  source_ip?: string | null;
  destination_ip?: string | null;
  process?: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  raw_message: string;
  metadata_payload?: Record<string, any>;
  is_synthetic?: boolean;
  ingested_at?: string;
}

export interface Alert {
  id: string;
  alert_id?: string;
  rule_id: string;
  incident_id?: string | null;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  confidence: number;
  source: string;
  mitre_tactic: string;
  mitre_technique_id: string;
  mitre_technique_name?: string;
  mitre_technique?: string;
  first_seen: string;
  last_seen: string;
  event_count: number;
  status: "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";
  affected_hosts: string[];
  source_ips: string[];
  target_users: string[];
  sample_events?: any[];
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  incident_id: string;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  risk_score: number;
  status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "ERADICATION" | "RECOVERY" | "CLOSED";
  correlation_id?: string | null;
  assigned_to_id?: string | null;
  affected_assets: string[];
  mitre_techniques: Array<any>;
  indicators: string[];
  containment_status: string;
  resolution_summary?: string | null;
  created_at: string;
  updated_at: string;
  alerts?: Alert[];
  evidence_items?: Evidence[];
  investigation_notes?: InvestigationNote[];
  response_actions?: ResponseAction[];
}

export interface Evidence {
  id: string;
  incident_id: string;
  evidence_type: "log" | "screenshot" | "ioc" | "event" | "report" | "analyst_note";
  description: string;
  sha256_hash: string;
  file_path?: string | null;
  source_reference?: string | null;
  collected_by?: string | null;
  collected_at: string;
  metadata_payload?: Record<string, any>;
}

export interface InvestigationNote {
  id: string;
  incident_id: string;
  author_username: string;
  note_text: string;
  created_at: string;
}

export interface ResponseAction {
  id: string;
  incident_id: string;
  action_type: string;
  description: string;
  target_identifier: string;
  status: "PENDING" | "EXECUTING" | "SUCCESS" | "FAILED";
  executed_by: string;
  result_summary?: string | null;
  executed_at: string;
}

export interface IOC {
  id: string;
  ioc_type?: "ip" | "domain" | "url" | "hash" | "username" | "filepath";
  type: string;
  value: string;
  threat_actor?: string;
  reputation: "CLEAN" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN";
  confidence: number;
  description?: string;
  first_seen: string;
  last_seen: string;
  source_count: number;
  tags?: string[];
}

export interface DetectionRule {
  id?: string;
  rule_id: string;
  name: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  mitre_tactic?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  mitre_technique?: string;
  description: string;
  enabled: boolean;
  is_enabled?: boolean;
  threshold?: any;
  group_by?: string[];
  raw_yaml?: string;
}

export interface MitreCoverageItem {
  technique_id: string;
  technique_name: string;
  tactic: string;
  rules_count: number;
  status: "COVERED" | "PARTIAL" | "NOT_IMPLEMENTED";
  rule_ids: string[];
}

export interface AttackScenario {
  id: string;
  name: string;
  description: string;
  category?: string;
  severity?: string;
  stages?: any[];
  expected_detections?: string[];
  expected_mitre?: string[];
  expected_risk_range?: { min: number; max: number };
  target?: { host?: string; service?: string; target_user?: string; source_ip?: string };
}

export interface SimulationResult {
  scenario_id: string;
  scenario_name: string;
  duration_seconds: number;
  events_generated: number;
  detections_triggered: number;
  alerts_generated: number;
  incidents_created: number;
  incident_id?: string | null;
  rules_matched: string[];
  mitre_techniques: string[];
  risk_score: number;
}

export interface DashboardSummary {
  total_events: number;
  total_alerts: number;
  open_incidents: number;
  critical_alerts: number;
  high_alerts: number;
  detection_rate: number;
  false_positive_rate: number;
  mtta_minutes: number;
  mttr_minutes: number;
  average_risk_score: number;
  active_scenarios: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource?: string | null;
  ip_address?: string | null;
  timestamp: string;
  metadata?: Record<string, any>;
}
