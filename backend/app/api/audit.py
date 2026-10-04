from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.audit_log import AuditLog
from backend.app.api.auth import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/api/audit", tags=["Audit Logging & Compliance"])


@router.get("", response_model=Dict[str, Any])
async def list_audit_logs(
    actor: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves immutable audit logs for analyst actions."""
    filters = []
    if actor:
        filters.append(AuditLog.actor_username.ilike(f"%{actor}%"))
    if action:
        filters.append(AuditLog.action == action)
    if resource_type:
        filters.append(AuditLog.resource_type == resource_type)

    base_query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if filters:
        base_query = base_query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total_count = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(base_query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit))).scalars().all()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "logs": [l.to_dict() for l in items],
    }
