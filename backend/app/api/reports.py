from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.report import Report
from backend.app.schemas.report import ReportCreateRequest
from backend.app.services.report_generator import ReportGenerator
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/api/reports", tags=["Incident Reports"])


@router.post("/incidents/{incident_id}", response_model=Dict[str, Any])
async def generate_report_for_incident(
    incident_id: str,
    payload: ReportCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generates an executive incident report in JSON, Markdown, or CSV format."""
    try:
        report_data = await ReportGenerator.generate_incident_report(
            session=db,
            incident_id=incident_id,
            format_type=payload.format,
            author_username=current_user.username,
        )

        await AuditService.log_action(
            session=db,
            actor_username=current_user.username,
            action="generate_incident_report",
            resource_type="report",
            resource_id=report_data["report_id"],
            metadata={"incident_id": incident_id, "format": payload.format},
        )

        return report_data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=List[Dict[str, Any]])
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists generated security reports."""
    stmt = select(Report).order_by(desc(Report.created_at)).limit(limit)
    items = (await db.execute(stmt)).scalars().all()
    return [r.to_dict() for r in items]


@router.get("/{report_id}", response_model=Dict[str, Any])
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetches a specific generated report."""
    stmt = select(Report).where(Report.id == report_id)
    report = (await db.execute(stmt)).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    res = report.to_dict()
    res["content_payload"] = report.content_payload
    return res
