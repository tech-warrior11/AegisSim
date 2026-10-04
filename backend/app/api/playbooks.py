from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.schemas.simulation import BlueTeamSubmission
from backend.app.services.training_service import BlueTeamTrainingService
from backend.app.api.auth import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/api/playbooks", tags=["Incident Response Playbooks & Blue Team Training"])


@router.get("", response_model=List[Dict[str, Any]])
async def get_response_playbooks(
    current_user: User = Depends(get_current_user),
):
    """Returns defensive SOC incident response procedures and step-by-step playbooks."""
    return [
        {
            "id": "PB-AUTH-001",
            "name": "Credential Stuffing & Brute Force Response Playbook",
            "category": "Authentication",
            "severity": "High",
            "mitre_tactic": "Credential Access (T1110)",
            "steps": [
                {"step": 1, "action": "Validate Source IP", "desc": "Check IP in threat intel & ascertain geolocation."},
                {"step": 2, "action": "Review Failed Count", "desc": "Filter timeline for frequency of login failures."},
                {"step": 3, "action": "Check Successful Login", "desc": "Verify whether subsequent login succeeded."},
                {"step": 4, "action": "Identify Target Account", "desc": "Determine if single user or password spray across multiple users."},
                {"step": 5, "action": "Inspect Post-Auth Actions", "desc": "Search for sudo commands, file accesses, or shell spawns."},
                {"step": 6, "action": "Execute Containment", "desc": "Block IP on firewall, terminate active sessions, force password reset."},
                {"step": 7, "action": "Document Evidence", "desc": "Collect SSH auth logs and hash with SHA-256 for final report."},
            ],
        },
        {
            "id": "PB-WEB-001",
            "name": "Web Application Exploitation Response Playbook",
            "category": "Web Security",
            "severity": "High",
            "mitre_tactic": "Initial Access (T1190)",
            "steps": [
                {"step": 1, "action": "Identify Request Pattern", "desc": "Inspect HTTP method, query parameters, and payload for SQLi/XSS/Traversal."},
                {"step": 2, "action": "Analyze HTTP Response", "desc": "Check if web service responded with 200 OK (potential exploit) or 403/404."},
                {"step": 3, "action": "Search Related Endpoints", "desc": "Hunt for scanner activity across /.env, /.git, /admin."},
                {"step": 4, "action": "Inspect Child Processes", "desc": "Verify if web daemon spawned /bin/sh or bash."},
                {"step": 5, "action": "Execute Containment", "desc": "Block attacker IP at WAF, sanitize input, patch vulnerable endpoint."},
            ],
        },
        {
            "id": "PB-PROC-001",
            "name": "Suspicious Process & Web Shell Response Playbook",
            "category": "Endpoint",
            "severity": "Critical",
            "mitre_tactic": "Execution (T1059)",
            "steps": [
                {"step": 1, "action": "Identify Process Tree", "desc": "Trace parent process (e.g. nginx -> bash) and command-line arguments."},
                {"step": 2, "action": "Decode Base64 Payloads", "desc": "Analyze encoded strings passed into bash or PowerShell."},
                {"step": 3, "action": "Review Outbound Sockets", "desc": "Inspect if process established reverse shell or C2 connection."},
                {"step": 4, "action": "Isolate Endpoint", "desc": "Quarantine host from network and kill unauthorized PID."},
                {"step": 5, "action": "Collect Artifacts", "desc": "Dump process memory and log SHA-256 binary hash."},
            ],
        },
        {
            "id": "PB-PRIV-001",
            "name": "Privilege Escalation & Credential Access Response Playbook",
            "category": "Privilege",
            "severity": "Critical",
            "mitre_tactic": "Privilege Escalation (T1068)",
            "steps": [
                {"step": 1, "action": "Verify Sudo Invocation", "desc": "Review auditd logs for unauthorized 'sudo su' or gtfobins binaries."},
                {"step": 2, "action": "Check Shadow / Key Access", "desc": "Detect read attempts on /etc/shadow or SSH private keys."},
                {"step": 3, "action": "Review Account Modifications", "desc": "Inspect if new accounts were added to sudoers / wheel group."},
                {"step": 4, "action": "Revoke Privileges", "desc": "Lock compromised user account and restore clean sudoers file."},
            ],
        },
    ]


@router.post("/training/evaluate/{incident_id}", response_model=Dict[str, Any])
async def evaluate_training_submission(
    incident_id: str,
    submission: BlueTeamSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Evaluates Blue Team analyst triage answers and generates Training Score & Feedback."""
    return await BlueTeamTrainingService.evaluate_analyst_submission(
        session=db,
        incident_id=incident_id,
        answers=submission.model_dump(),
    )
