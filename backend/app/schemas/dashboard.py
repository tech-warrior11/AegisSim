from typing import List, Dict, Any
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_events: int
    total_alerts: int
    open_incidents: int
    critical_alerts: int
    high_alerts: int
    detection_rate: float
    false_positive_rate: float
    mtta_minutes: float  # Mean Time to Acknowledge
    mttr_minutes: float  # Mean Time to Resolve
    average_risk_score: float
    active_scenarios: int


class MitreCoverageItem(BaseModel):
    tactic: str
    technique_id: str
    technique_name: str
    rule_id: str
    rule_name: str
    events_observed: int
    alerts_triggered: int
    coverage_status: str  # COVERED, PARTIAL, NOT_IMPLEMENTED
