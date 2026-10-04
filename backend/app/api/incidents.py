from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.incident import Incident
from backend.app.models.alert import Alert
from backend.app.models.response_action import ResponseAction
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate
from backend.app.schemas.investigation import ResponseActionCreate
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService
from backend.app.api.websocket import ws_manager

router = APIRouter(prefix="/api/incidents", tags=["Incident Management & Response"])


@router.get("", response_model=Dict[str, Any])
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    min_risk: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists incidents with risk score, status, and severity filters."""
    filters = []
    if status:
        filters.append(Incident.status == status.upper())
    if severity:
        filters.append(Incident.severity == severity.lower())
    if min_risk is not None:
        filters.append(Incident.risk_score >= min_risk)
    if search:
        filters.append(
            or_(
                Incident.title.ilike(f"%{search}%"),
                Incident.description.ilike(f"%{search}%"),
                Incident.correlation_id.ilike(f"%{search}%"),
            )
        )

    base_query = select(Incident)
    count_query = select(func.count(Incident.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_count = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(base_query.order_by(desc(Incident.updated_at)).offset(offset).limit(limit))).scalars().all()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "incidents": [inc.to_dict() for inc in items],
    }


@router.get("/{incident_id}", response_model=Dict[str, Any])
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves full incident details including nested alerts, notes, evidence, and response actions."""
    stmt = select(Incident).where(Incident.id == incident_id)
    inc = (await db.execute(stmt)).scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    res = inc.to_dict()
    res["alerts"] = [a.to_dict() for a in inc.alerts]
    res["evidence_items"] = [e.to_dict() for e in inc.evidence_items]
    res["investigation_notes"] = [n.to_dict() for n in inc.investigation_notes]
    res["response_actions"] = [r.to_dict() for r in inc.response_actions]
    return res


@router.post("", response_model=Dict[str, Any])
async def create_incident(
    payload: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually creates a new security incident."""
    new_inc = Incident(
        title=payload.title,
        description=payload.description or "",
        severity=payload.severity,
        risk_score=payload.risk_score,
        status="OPEN",
        affected_assets=payload.affected_assets or [],
        indicators=payload.indicators or [],
        assigned_to_id=current_user.id,
    )
    db.add(new_inc)
    await db.flush()

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="create_incident",
        resource_type="incident",
        resource_id=new_inc.id,
    )

    await ws_manager.broadcast({
        "type": "INCIDENT_CREATED",
        "data": new_inc.to_dict(),
    })

    return new_inc.to_dict()


@router.patch("/{incident_id}", response_model=Dict[str, Any])
async def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates incident status, severity, containment, assignment, or resolution."""
    stmt = select(Incident).where(Incident.id == incident_id)
    inc = (await db.execute(stmt)).scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    if payload.title is not None:
        inc.title = payload.title
    if payload.description is not None:
        inc.description = payload.description
    if payload.status is not None:
        inc.status = payload.status.upper()
    if payload.severity is not None:
        inc.severity = payload.severity.lower()
    if payload.assigned_to_id is not None:
        inc.assigned_to_id = payload.assigned_to_id
    if payload.containment_status is not None:
        inc.containment_status = payload.containment_status
    if payload.resolution_summary is not None:
        inc.resolution_summary = payload.resolution_summary

    inc.updated_at = datetime.now(timezone.utc)
    await db.flush()

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="update_incident",
        resource_type="incident",
        resource_id=inc.id,
        metadata={"status": inc.status, "containment": inc.containment_status},
    )

    await ws_manager.broadcast({
        "type": "INCIDENT_UPDATE",
        "data": inc.to_dict(),
    })

    return inc.to_dict()


@router.post("/{incident_id}/actions", response_model=Dict[str, Any])
async def execute_response_action(
    incident_id: str,
    payload: ResponseActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes a defensive response / containment playbook action."""
    stmt = select(Incident).where(Incident.id == incident_id)
    inc = (await db.execute(stmt)).scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    # Simulate lab containment action execution
    action_type = payload.action_type
    target = payload.target_identifier

    result_summary = f"Simulated defensive containment: Successfully executed '{action_type}' targeting '{target}' in lab environment."

    action_record = ResponseAction(
        incident_id=incident_id,
        action_type=action_type,
        target_identifier=target,
        description=payload.description,
        status="SUCCESS",
        executed_by=current_user.username,
        result_summary=result_summary,
        metadata_payload={"timestamp": datetime.now(timezone.utc).isoformat()},
    )
    db.add(action_record)

    # Auto-update incident containment status
    inc.containment_status = "CONTAINED"
    inc.updated_at = datetime.now(timezone.utc)
    await db.flush()

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="execute_response_action",
        resource_type="response_action",
        resource_id=action_record.id,
        metadata={"action_type": action_type, "target": target},
    )

    await ws_manager.broadcast({
        "type": "RESPONSE_ACTION_EXECUTED",
        "data": action_record.to_dict(),
    })

    return action_record.to_dict()
