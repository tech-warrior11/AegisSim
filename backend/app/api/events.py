from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.event import Event
from backend.app.schemas.event import RawEventInput, BatchEventInput, NormalizedEventSchema
from backend.app.services.event_processor import event_processor
from backend.app.api.auth import get_current_user, require_role
from backend.app.models.user import User

router = APIRouter(prefix="/api/events", tags=["Event Ingestion & Analysis"])


@router.get("", response_model=Dict[str, Any])
async def list_events(
    source: Optional[str] = None,
    host: Optional[str] = None,
    event_type: Optional[str] = None,
    action: Optional[str] = None,
    user: Optional[str] = None,
    source_ip: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves paginated normalized security events with multi-field filtering."""
    filters = []

    if source:
        filters.append(Event.source.ilike(f"%{source}%"))
    if host:
        filters.append(Event.host.ilike(f"%{host}%"))
    if event_type:
        filters.append(Event.event_type == event_type.lower())
    if action:
        filters.append(Event.action == action.lower())
    if user:
        filters.append(Event.user.ilike(f"%{user}%"))
    if source_ip:
        filters.append(Event.source_ip == source_ip)
    if severity:
        filters.append(Event.severity == severity.lower())
    if start_time:
        filters.append(Event.timestamp >= start_time)
    if end_time:
        filters.append(Event.timestamp <= end_time)
    if search:
        filters.append(
            or_(
                Event.raw_message.ilike(f"%{search}%"),
                Event.process.ilike(f"%{search}%"),
                Event.source_ip.ilike(f"%{search}%"),
                Event.user.ilike(f"%{search}%"),
            )
        )

    base_query = select(Event)
    count_query = select(func.count(Event.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Total count for pagination
    total_res = await db.execute(count_query)
    total_count = total_res.scalar_one()

    # Query items
    base_query = base_query.order_by(desc(Event.timestamp)).offset(offset).limit(limit)
    items_res = await db.execute(base_query)
    events = [e.to_dict() for e in items_res.scalars().all()]

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "events": events,
    }


@router.get("/{event_id}", response_model=Dict[str, Any])
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetches a single event by ID."""
    stmt = select(Event).where(Event.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found.")
    return event.to_dict()


@router.post("", response_model=Dict[str, Any])
async def ingest_event(
    payload: RawEventInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingests and normalizes a single raw security event."""
    result = await event_processor.ingest_single_event(
        session=db,
        raw_data=payload.model_dump(),
        broadcast=True,
    )
    return result


@router.post("/bulk", response_model=Dict[str, Any])
async def ingest_bulk_events(
    payload: BatchEventInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch ingestion of multiple raw security events."""
    raw_list = [e.model_dump() for e in payload.events]
    result = await event_processor.ingest_batch(
        session=db,
        events=raw_list,
        broadcast_summary=True,
    )
    return result


@router.post("/ndjson", response_model=Dict[str, Any])
async def ingest_ndjson(
    ndjson_data: str = Body(..., media_type="text/plain"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingests newline-delimited JSON raw log text stream."""
    return await event_processor.ingest_ndjson(db, ndjson_data)


@router.post("/csv", response_model=Dict[str, Any])
async def ingest_csv(
    csv_data: str = Body(..., media_type="text/csv"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingests CSV formatted log text stream."""
    return await event_processor.ingest_csv(db, csv_data)
