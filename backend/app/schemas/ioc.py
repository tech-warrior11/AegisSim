from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class IOCCreate(BaseModel):
    ioc_type: str
    value: str
    threat_actor: Optional[str] = "Unknown"
    reputation: str = "SUSPICIOUS"  # CLEAN, SUSPICIOUS, MALICIOUS, UNKNOWN
    confidence: float = 0.8
    description: Optional[str] = ""
    tags: Optional[List[str]] = None


class IOCResponse(BaseModel):
    id: str
    ioc_type: str
    value: str
    threat_actor: Optional[str] = "Unknown"
    reputation: str
    confidence: float
    description: Optional[str] = None
    first_seen: datetime
    last_seen: datetime
    source_count: int
    tags: List[str]

    class Config:
        from_attributes = True
