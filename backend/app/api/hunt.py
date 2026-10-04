from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.event import Event
from backend.app.models.saved_hunt import SavedHunt
from backend.app.schemas.hunt import HuntQueryRequest, SaveHuntRequest
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/api/hunt", tags=["Threat Hunting & Query Builder"])


@router.post("/search", response_model=Dict[str, Any])
async def search_events_hunt(
    query: HuntQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes a proactive threat hunting query against normalized telemetry."""
    filters = []

    if query.source_ip:
        filters.append(Event.source_ip == query.source_ip)
    if query.destination_ip:
        filters.append(Event.destination_ip == query.destination_ip)
    if query.user:
        filters.append(Event.user.ilike(f"%{query.user}%"))
    if query.host:
        filters.append(Event.host.ilike(f"%{query.host}%"))
    if query.event_type:
        filters.append(Event.event_type == query.event_type.lower())
    if query.action:
        filters.append(Event.action == query.action.lower())
    if query.process:
        filters.append(Event.process.ilike(f"%{query.process}%"))
    if query.severity:
        filters.append(Event.severity == query.severity.lower())
    if query.start_time:
        filters.append(Event.timestamp >= query.start_time)
    if query.end_time:
        filters.append(Event.timestamp <= query.end_time)
    if query.keyword:
        filters.append(
            or_(
                Event.raw_message.ilike(f"%{query.keyword}%"),
                Event.process.ilike(f"%{query.keyword}%"),
                Event.source_ip.ilike(f"%{query.keyword}%"),
                Event.destination_ip.ilike(f"%{query.keyword}%"),
                Event.user.ilike(f"%{query.keyword}%"),
            )
        )

    base_query = select(Event)
    count_query = select(func.count(Event.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_count = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(base_query.order_by(desc(Event.timestamp)).offset(query.offset).limit(query.limit))).scalars().all()

    # Log hunt execution
    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="execute_threat_hunt",
        resource_type="threat_hunt",
        metadata={"matches": total_count, "filter": query.model_dump(exclude_none=True)},
    )

    return {
        "total_matches": total_count,
        "limit": query.limit,
        "offset": query.offset,
        "results": [e.to_dict() for e in items],
    }


@router.post("/save", response_model=Dict[str, Any])
async def save_hunt_query(
    payload: SaveHuntRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Saves a threat hunting query template for team reuse."""
    saved = SavedHunt(
        title=payload.title,
        description=payload.description,
        query_dsl=payload.query_dsl,
        created_by=current_user.username,
        tags=payload.tags or [],
    )
    db.add(saved)
    await db.flush()
    return saved.to_dict()


@router.get("/saved", response_model=List[Dict[str, Any]])
async def list_saved_hunts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists saved threat hunting queries."""
    stmt = select(SavedHunt).order_by(desc(SavedHunt.created_at))
    items = (await db.execute(stmt)).scalars().all()
    return [s.to_dict() for s in items]
