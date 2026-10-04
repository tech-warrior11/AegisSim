from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class HuntQueryRequest(BaseModel):
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    user: Optional[str] = None
    host: Optional[str] = None
    event_type: Optional[str] = None
    action: Optional[str] = None
    process: Optional[str] = None
    severity: Optional[str] = None
    keyword: Optional[str] = None
    raw_query: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


class SaveHuntRequest(BaseModel):
    title: str
    description: Optional[str] = None
    query_dsl: Dict[str, Any]
    tags: Optional[List[str]] = None


class SavedHuntResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    query_dsl: Dict[str, Any]
    created_by: str
    tags: List[str]
    match_count: int
    last_executed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
