from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class NoteCreate(BaseModel):
    note_text: str


class EvidenceCreate(BaseModel):
    evidence_type: str  # log, screenshot, ioc, event, report, analyst_note
    description: str
    raw_text: Optional[str] = None
    source_reference: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ResponseActionCreate(BaseModel):
    action_type: str  # block_ip, isolate_host, disable_user, terminate_process
    target_identifier: str
    description: str
