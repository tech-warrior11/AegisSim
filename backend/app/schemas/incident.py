from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    severity: str = "medium"
    risk_score: int = 50
    affected_assets: Optional[List[str]] = None
    indicators: Optional[List[str]] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # OPEN, INVESTIGATING, CONTAINED, ERADICATION, RECOVERY, CLOSED
    severity: Optional[str] = None
    assigned_to_id: Optional[str] = None
    containment_status: Optional[str] = None
    resolution_summary: Optional[str] = None


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    risk_score: int
    status: str
    correlation_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    affected_assets: List[str]
    mitre_techniques: List[Dict[str, Any]]
    indicators: List[str]
    containment_status: str
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
