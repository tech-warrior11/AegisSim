from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class DetectionRuleCreate(BaseModel):
    id: str
    name: str
    category: str
    severity: str = "medium"
    mitre_tactic: str = "Discovery"
    mitre_technique_id: str = "T1046"
    mitre_technique_name: str = ""
    description: str = ""
    rule_yaml: str
    is_enabled: bool = True


class DetectionRuleUpdate(BaseModel):
    name: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    rule_yaml: Optional[str] = None
    is_enabled: Optional[bool] = None


class DetectionRuleResponse(BaseModel):
    id: str
    name: str
    category: str
    severity: str
    mitre_tactic: str
    mitre_technique_id: str
    mitre_technique_name: str
    description: str
    is_enabled: bool
    created_at: datetime
    rule_yaml: Optional[str] = None

    class Config:
        from_attributes = True
