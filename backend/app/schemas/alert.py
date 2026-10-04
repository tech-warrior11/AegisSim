from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AlertUpdate(BaseModel):
    status: Optional[str] = None  # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    severity: Optional[str] = None


class AlertResponse(BaseModel):
    id: str
    rule_id: str
    incident_id: Optional[str] = None
    title: str
    description: str
    severity: str
    confidence: float
    source: str
    mitre_tactic: str
    mitre_technique_id: str
    mitre_technique_name: str
    first_seen: datetime
    last_seen: datetime
    event_count: int
    status: str
    affected_hosts: List[str]
    source_ips: List[str]
    target_users: List[str]
    sample_events: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
