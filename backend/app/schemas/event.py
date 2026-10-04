from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class RawEventInput(BaseModel):
    source: str = Field(..., example="linux-auth")
    host: Optional[str] = Field(default="lab-linux-01", example="lab-linux-01")
    raw_message: str = Field(..., example="Failed password for invalid user admin from 10.10.10.50 port 45892 ssh2")
    timestamp: Optional[datetime] = None
    event_type: Optional[str] = None
    action: Optional[str] = None
    user: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    process: Optional[str] = None
    severity: Optional[str] = "low"
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_synthetic: Optional[bool] = True


class BatchEventInput(BaseModel):
    events: List[RawEventInput]


class NormalizedEventSchema(BaseModel):
    id: str
    timestamp: datetime
    source: str
    host: str
    event_type: str
    action: str
    user: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    process: Optional[str] = None
    severity: str = "low"
    raw_message: str
    metadata_payload: Dict[str, Any] = Field(default_factory=dict)
    is_synthetic: bool = True
    ingested_at: datetime
    extracted_iocs: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True


class EventFilterQuery(BaseModel):
    source: Optional[str] = None
    host: Optional[str] = None
    event_type: Optional[str] = None
    action: Optional[str] = None
    user: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    process: Optional[str] = None
    severity: Optional[str] = None
    search: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
