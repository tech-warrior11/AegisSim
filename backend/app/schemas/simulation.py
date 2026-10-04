from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ScenarioRunResponse(BaseModel):
    id: str
    scenario_id: str
    scenario_name: str
    status: str
    duration_seconds: float
    events_generated: int
    detections_triggered: int
    alerts_generated: int
    incident_id: Optional[str] = None
    mitre_techniques: List[str]
    risk_score: int
    target_host: str
    target_user: str
    source_ip: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BlueTeamSubmission(BaseModel):
    source_ip: str
    target_user: str
    mitre_technique: str
    containment_action: str
