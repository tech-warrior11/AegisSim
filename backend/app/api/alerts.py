from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertUpdate
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService
from backend.app.api.websocket import ws_manager

router = APIRouter(prefix="/api/alerts", tags=["Alert Management"])


@router.get("", response_model=Dict[str, Any])
async def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    mitre_tactic: Optional[str] = None,
    rule_id: Optional[str] = None,
    incident_id: Optional[str] = None,
    host: Optional[str] = None,
    source_ip: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists alerts with status, severity, and MITRE tactic filtering."""
    filters = []
    if status:
        filters.append(Alert.status == status.upper())
    if severity:
        filters.append(Alert.severity == severity.lower())
    if mitre_tactic:
        filters.append(Alert.mitre_tactic.ilike(f"%{mitre_tactic}%"))
    if rule_id:
        filters.append(Alert.rule_id == rule_id)
    if incident_id:
        filters.append(Alert.incident_id == incident_id)

    base_query = select(Alert)
    count_query = select(func.count(Alert.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_count = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(base_query.order_by(desc(Alert.first_seen)).offset(offset).limit(limit))).scalars().all()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "alerts": [a.to_dict() for a in items],
    }


@router.get("/{alert_id}", response_model=Dict[str, Any])
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetches full details of a specific alert."""
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await db.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    return alert.to_dict()


@router.patch("/{alert_id}", response_model=Dict[str, Any])
async def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates alert status (e.g. ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE)."""
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await db.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    if payload.status:
        alert.status = payload.status.upper()
    if payload.severity:
        alert.severity = payload.severity.lower()

    await db.flush()
    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="update_alert",
        resource_type="alert",
        resource_id=alert.id,
        metadata={"new_status": alert.status},
    )

    await ws_manager.broadcast({
        "type": "ALERT_STATUS_CHANGED",
        "data": alert.to_dict(),
    })

    return alert.to_dict()


@router.post("/{alert_id}/acknowledge", response_model=Dict[str, Any])
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quickly acknowledges an incoming alert."""
    stmt = select(Alert).where(Alert.id == alert_id)
    alert = (await db.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = current_user.username

    await db.flush()
    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="acknowledge_alert",
        resource_type="alert",
        resource_id=alert.id,
    )

    await ws_manager.broadcast({
        "type": "ALERT_ACKNOWLEDGED",
        "data": alert.to_dict(),
    })

    return alert.to_dict()
