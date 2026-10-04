from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class ReportCreateRequest(BaseModel):
    format: str = "JSON"  # JSON, MARKDOWN, CSV


class ReportResponse(BaseModel):
    id: str
    incident_id: str
    title: str
    report_format: str
    executive_summary: str
    root_cause: Optional[str] = None
    recommendations: Optional[str] = None
    generated_by: str
    created_at: datetime

    class Config:
        from_attributes = True
