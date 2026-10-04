from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.scenario import ScenarioRun
from backend.app.services.simulation_service import simulation_service
from backend.app.api.auth import get_current_user, require_role
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/api/simulations", tags=["Attack Simulator & Lab Engine"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_available_scenarios(
    current_user: User = Depends(get_current_user),
):
    """Lists available pre-packaged attack scenarios."""
    return simulation_service.list_scenarios()


@router.post("/{scenario_id}/run", response_model=Dict[str, Any])
async def run_attack_scenario(
    scenario_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"])),
):
    """Triggers safe attack simulation execution against local lab targets."""
    try:
        result = await simulation_service.execute_scenario(
            session=db,
            scenario_id=scenario_id,
            actor_username=current_user.username,
        )

        await AuditService.log_action(
            session=db,
            actor_username=current_user.username,
            action="run_attack_simulation",
            resource_type="simulation",
            resource_id=scenario_id,
            metadata={"run_id": result["run_id"], "events": result["events_generated"]},
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/runs", response_model=List[Dict[str, Any]])
async def list_simulation_runs(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves history of executed simulation runs."""
    stmt = select(ScenarioRun).order_by(desc(ScenarioRun.started_at)).limit(limit)
    runs = (await db.execute(stmt)).scalars().all()
    return [r.to_dict() for r in runs]


@router.get("/runs/{run_id}", response_model=Dict[str, Any])
async def get_simulation_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetches details of a specific simulation run."""
    stmt = select(ScenarioRun).where(ScenarioRun.id == run_id)
    run = (await db.execute(stmt)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation run {run_id} not found.")
    return run.to_dict()
