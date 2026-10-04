import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.models.detection_rule import DetectionRule
from backend.app.models.alert import Alert
from backend.app.models.event import Event
from backend.app.schemas.detection import DetectionRuleCreate, DetectionRuleUpdate, DetectionRuleResponse
from backend.app.services.detection_engine import DetectionEngine
from backend.app.api.auth import get_current_user, require_role
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/api/detections", tags=["Detection Engineering & MITRE"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_detection_rules(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    mitre_tactic: Optional[str] = None,
    enabled_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists all configured detection rules."""
    engine = DetectionEngine()
    rules = []

    for r_id, r in engine.rules.items():
        if category and r.get("category", "").lower() != category.lower():
            continue
        if severity and r.get("severity", "").lower() != severity.lower():
            continue
        if enabled_only and not r.get("enabled", True):
            continue

        mitre = r.get("mitre_attack", {})
        rules.append({
            "id": r_id,
            "name": r.get("name", r_id),
            "category": r.get("category", "generic"),
            "severity": r.get("severity", "medium"),
            "mitre_tactic": mitre.get("tactic", "Discovery"),
            "mitre_technique_id": mitre.get("technique_id", "T1046"),
            "mitre_technique_name": mitre.get("technique_name", ""),
            "description": r.get("description", ""),
            "is_enabled": r.get("enabled", True),
            "threshold": r.get("threshold", {}),
            "group_by": r.get("group_by", []),
        })

    return rules


@router.get("/coverage", response_model=List[Dict[str, Any]])
async def get_detection_coverage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculates live MITRE ATT&CK framework detection coverage."""
    engine = DetectionEngine()

    # Query alert counts per rule
    stmt = select(Alert.rule_id, func.count(Alert.id)).group_by(Alert.rule_id)
    res = await db.execute(stmt)
    alert_counts = dict(res.all())

    coverage_map = []
    for r_id, r in engine.rules.items():
        mitre = r.get("mitre_attack", {})
        alerts_trig = alert_counts.get(r_id, 0)

        status = "COVERED" if r.get("enabled", True) else "PARTIAL"

        coverage_map.append({
            "rule_id": r_id,
            "rule_name": r.get("name", r_id),
            "category": r.get("category", "generic"),
            "severity": r.get("severity", "medium"),
            "tactic": mitre.get("tactic", "Discovery"),
            "technique_id": mitre.get("technique_id", "T1046"),
            "technique_name": mitre.get("technique_name", "Network Service Scanning"),
            "alerts_triggered": alerts_trig,
            "coverage_status": status,
        })

    return coverage_map


@router.get("/{rule_id}", response_model=Dict[str, Any])
async def get_detection_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves single rule details along with raw YAML structure."""
    engine = DetectionEngine()
    rule = engine.rules.get(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found.")

    return {
        "id": rule_id,
        "name": rule.get("name"),
        "category": rule.get("category"),
        "severity": rule.get("severity"),
        "mitre_attack": rule.get("mitre_attack", {}),
        "description": rule.get("description"),
        "condition": rule.get("condition", {}),
        "threshold": rule.get("threshold", {}),
        "group_by": rule.get("group_by", []),
        "enabled": rule.get("enabled", True),
    }


@router.patch("/{rule_id}/toggle", response_model=Dict[str, Any])
async def toggle_rule(
    rule_id: str,
    enabled: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"])),
):
    """Toggles rule enable/disable state."""
    engine = DetectionEngine()
    if rule_id not in engine.rules:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found.")

    engine.rules[rule_id]["enabled"] = enabled

    await AuditService.log_action(
        session=db,
        actor_username=current_user.username,
        action="toggle_detection_rule",
        resource_type="detection_rule",
        resource_id=rule_id,
        metadata={"is_enabled": enabled},
    )

    return {"rule_id": rule_id, "is_enabled": enabled}
