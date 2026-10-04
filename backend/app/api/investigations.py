from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.investigation_note import InvestigationNote
from backend.app.models.incident import Incident
from backend.app.schemas.investigation import NoteCreate, EvidenceCreate
from backend.app.services.timeline import TimelineService
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.audit_service import AuditService
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.api.websocket import ws_manager

router = APIRouter(prefix="/api/incidents/{incident_id}", tags=["Investigation Workbench"])


@router.get("/timeline", response_model=List[Dict[str, Any]])
async def get_incident_timeline(
    incident_id: str,
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves unified chronological investigation timeline."""
    return await TimelineService.get_incident_timeline(db, incident_id, limit=limit)


@router.post("/notes", response_model=Dict[str, Any])
async def add_investigation_note(
    incident_id: str,
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Appends an analyst note to the incident investigation."""
    stmt = select(Incident).where(Incident.id == incident_id)
    inc = (await db.execute(stmt)).scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    note = InvestigationNote(
        incident_id=incident_id,
        author_username=current_user.username,
        author_id=current_user.id,
        note_text=payload.note_text,
    )
    db.add(note)
    await db.flush()

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="add_investigation_note",
        resource_type="investigation_note",
        resource_id=note.id,
    )

    await ws_manager.broadcast({
        "type": "INVESTIGATION_NOTE_ADDED",
        "data": note.to_dict(),
    })

    return note.to_dict()


@router.post("/evidence", response_model=Dict[str, Any])
async def add_incident_evidence(
    incident_id: str,
    payload: EvidenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a verified evidence record with automatic SHA-256 calculation."""
    stmt = select(Incident).where(Incident.id == incident_id)
    inc = (await db.execute(stmt)).scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    evidence_record = await EvidenceService.add_evidence(
        session=db,
        incident_id=incident_id,
        evidence_type=payload.evidence_type,
        description=payload.description,
        raw_text=payload.raw_text,
        source_reference=payload.source_reference,
        collected_by=current_user.username,
        metadata=payload.metadata,
    )

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="add_evidence",
        resource_type="evidence",
        resource_id=evidence_record.id,
        metadata={"sha256": evidence_record.sha256_hash},
    )

    await ws_manager.broadcast({
        "type": "EVIDENCE_ADDED",
        "data": evidence_record.to_dict(),
    })

    return evidence_record.to_dict()
