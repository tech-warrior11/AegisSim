from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models.incident import Incident
from backend.app.models.alert import Alert


class BlueTeamTrainingService:
    """Provides Blue Team analyst evaluation scenarios, grading, and defensive training feedback."""

    @classmethod
    async def evaluate_analyst_submission(
        cls,
        session: AsyncSession,
        incident_id: str,
        answers: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Grades an analyst's triage submission against the incident's ground truth.
        Returns a Training Score (0-100), score breakdown, and defensive feedback.
        """
        stmt = select(Incident).where(Incident.id == incident_id)
        res = await session.execute(stmt)
        incident = res.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        # Fetch associated alerts
        alert_stmt = select(Alert).where(Alert.incident_id == incident_id)
        alert_res = await session.execute(alert_stmt)
        alerts = alert_res.scalars().all()

        ground_truth_ips = set()
        ground_truth_users = set()
        ground_truth_techniques = set()

        for a in alerts:
            for ip in (a.source_ips or []):
                ground_truth_ips.add(ip)
            for u in (a.target_users or []):
                ground_truth_users.add(u)
            if a.mitre_technique_id:
                ground_truth_techniques.add(a.mitre_technique_id)

        submitted_ip = str(answers.get("source_ip", "")).strip()
        submitted_user = str(answers.get("target_user", "")).strip()
        submitted_technique = str(answers.get("mitre_technique", "")).strip()
        submitted_containment = str(answers.get("containment_action", "")).strip().lower()

        score_components = {}
        total_score = 0

        # 1. Attacker IP Identification (25 points)
        if submitted_ip in ground_truth_ips:
            score_components["attacker_ip"] = {"points": 25, "max": 25, "status": "CORRECT", "feedback": "Identified correct adversary source IP."}
            total_score += 25
        else:
            score_components["attacker_ip"] = {"points": 0, "max": 25, "status": "INCORRECT", "feedback": f"Expected one of: {list(ground_truth_ips)}"}

        # 2. Targeted User Identification (25 points)
        if submitted_user in ground_truth_users:
            score_components["target_user"] = {"points": 25, "max": 25, "status": "CORRECT", "feedback": "Identified correct targeted account."}
            total_score += 25
        else:
            score_components["target_user"] = {"points": 0, "max": 25, "status": "INCORRECT", "feedback": f"Expected one of: {list(ground_truth_users)}"}

        # 3. MITRE Technique Identification (25 points)
        if submitted_technique in ground_truth_techniques:
            score_components["mitre_technique"] = {"points": 25, "max": 25, "status": "CORRECT", "feedback": f"Correctly mapped technique {submitted_technique}."}
            total_score += 25
        elif any(submitted_technique in t for t in ground_truth_techniques):
            score_components["mitre_technique"] = {"points": 15, "max": 25, "status": "PARTIAL", "feedback": f"Partially matched technique {submitted_technique}."}
            total_score += 15
        else:
            score_components["mitre_technique"] = {"points": 0, "max": 25, "status": "INCORRECT", "feedback": f"Expected one of: {list(ground_truth_techniques)}"}

        # 4. Containment Action Selection (25 points)
        valid_containment_keywords = ["block", "isolate", "disable", "terminate", "quarantine", "reset"]
        if any(kw in submitted_containment for kw in valid_containment_keywords):
            score_components["containment_action"] = {"points": 25, "max": 25, "status": "CORRECT", "feedback": "Action aligned with defensive containment playbooks."}
            total_score += 25
        else:
            score_components["containment_action"] = {"points": 5, "max": 25, "status": "INSUFFICIENT", "feedback": "Containment action should specify IP blocking, host isolation, or account reset."}
            total_score += 5

        # Performance Evaluation Label
        if total_score >= 90:
            rating = "EXEMPLARY - Lead Incident Responder Level"
        elif total_score >= 75:
            rating = "PROFICIENT - Senior SOC Analyst Level"
        elif total_score >= 50:
            rating = "DEVELOPING - Junior SOC Analyst Level"
        else:
            rating = "NEEDS_REVIEW - Review MITRE ATT&CK & Triage Procedures"

        return {
            "training_score": total_score,
            "rating": rating,
            "score_breakdown": score_components,
            "ground_truth": {
                "source_ips": list(ground_truth_ips),
                "target_users": list(ground_truth_users),
                "mitre_techniques": list(ground_truth_techniques),
                "recommended_containment": "1. Block source IP at perimeter firewall. 2. Isolate affected host. 3. Rotate compromised user credentials.",
            },
            "investigation_path": [
                "Step 1: Inspect first seen alert and filter timeline for source IP.",
                "Step 2: Pivot from authentication failure to successful login.",
                "Step 3: Analyze process execution and privilege escalation audit records.",
                "Step 4: Extract IOCs and query Threat Intel repository.",
                "Step 5: Execute playbook response action and compile incident report.",
            ],
        }
