from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.ioc import IOC
from backend.app.schemas.ioc import IOCCreate
from backend.app.services.threat_intel import threat_intel
from backend.app.api.auth import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/api/iocs", tags=["Threat Intelligence & IOCs"])


@router.get("", response_model=Dict[str, Any])
async def list_iocs(
    ioc_type: Optional[str] = None,
    reputation: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists observed Indicators of Compromise (IOCs) with filtering."""
    filters = []
    if ioc_type:
        filters.append(IOC.ioc_type == ioc_type.lower())
    if reputation:
        filters.append(IOC.reputation == reputation.upper())
    if search:
        filters.append(IOC.value.ilike(f"%{search}%"))

    base_query = select(IOC)
    count_query = select(func.count(IOC.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_count = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(base_query.order_by(desc(IOC.last_seen)).offset(offset).limit(limit))).scalars().all()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "iocs": [i.to_dict() for i in items],
    }


@router.get("/{ioc_id}", response_model=Dict[str, Any])
async def get_ioc(
    ioc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves specific IOC record."""
    stmt = select(IOC).where(IOC.id == ioc_id)
    ioc = (await db.execute(stmt)).scalar_one_or_none()
    if not ioc:
        raise HTTPException(status_code=404, detail=f"IOC {ioc_id} not found.")
    return ioc.to_dict()


@router.post("", response_model=Dict[str, Any])
async def create_ioc(
    payload: IOCCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Adds a manual IOC record into the threat repository."""
    stmt = select(IOC).where(IOC.value == payload.value)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing.to_dict()

    new_ioc = IOC(
        ioc_type=payload.ioc_type.lower(),
        value=payload.value,
        threat_actor=payload.threat_actor or "Unknown",
        reputation=payload.reputation.upper(),
        confidence=payload.confidence,
        description=payload.description,
        tags=payload.tags or [],
    )
    db.add(new_ioc)
    await db.flush()
    return new_ioc.to_dict()


@router.post("/lookup", response_model=Dict[str, Any])
async def lookup_threat_intel(
    query_type: str = Query(..., pattern="^(ip|domain|hash)$"),
    value: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Queries threat intelligence provider for reputation assessment."""
    if query_type == "ip":
        return threat_intel.lookup_ip(value)
    elif query_type == "domain":
        return threat_intel.lookup_domain(value)
    elif query_type == "hash":
        return threat_intel.lookup_hash(value)
    return {"found": False}
