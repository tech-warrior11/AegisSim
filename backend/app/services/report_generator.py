import json
import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.incident import Incident
from backend.app.models.alert import Alert
from backend.app.models.evidence import Evidence
from backend.app.models.investigation_note import InvestigationNote
from backend.app.models.response_action import ResponseAction
from backend.app.models.report import Report


class ReportGenerator:
    """Generates comprehensive incident reports across JSON, Markdown, and CSV formats."""

    @classmethod
    async def generate_incident_report(
        cls,
        session: AsyncSession,
        incident_id: str,
        format_type: str = "JSON",
        author_username: str = "SOC_ANALYST",
    ) -> Dict[str, Any]:
        """Compiles incident telemetry, timeline, MITRE techniques, evidence, and recommendations."""
        # 1. Fetch Incident
        inc_stmt = select(Incident).where(Incident.id == incident_id)
        inc_res = await session.execute(inc_stmt)
        incident = inc_res.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        # 2. Fetch Alerts
        alert_stmt = select(Alert).where(Alert.incident_id == incident_id)
        alert_res = await session.execute(alert_stmt)
        alerts = alert_res.scalars().all()

        # 3. Fetch Evidence
        ev_stmt = select(Evidence).where(Evidence.incident_id == incident_id)
        ev_res = await session.execute(ev_stmt)
        evidence_items = ev_res.scalars().all()

        # 4. Fetch Notes
        notes_stmt = select(InvestigationNote).where(InvestigationNote.incident_id == incident_id)
        notes_res = await session.execute(notes_stmt)
        notes = notes_res.scalars().all()

        # 5. Fetch Response Actions
        resp_stmt = select(ResponseAction).where(ResponseAction.incident_id == incident_id)
        resp_res = await session.execute(resp_stmt)
        actions = resp_res.scalars().all()

        # Build Structured Content
        executive_summary = (
            f"On {incident.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}, AegisSim detection engine identified a "
            f"{incident.severity.upper()} severity security incident (Risk Score: {incident.risk_score}/100) affecting "
            f"assets {', '.join(incident.affected_assets or ['unknown'])}. The intrusion was correlated across "
            f"{len(alerts)} distinct alerts with {len(incident.mitre_techniques or [])} observed MITRE ATT&CK techniques. "
            f"Containment status is currently marked as {incident.containment_status}."
        )

        root_cause = (
            f"Adversary activity originating from indicator(s) {', '.join(incident.indicators or ['unknown'])} "
            f"leveraged techniques consistent with {', '.join([t.get('technique_name', '') for t in (incident.mitre_techniques or []) if isinstance(t, dict)])}."
        )

        recommendations = (
            "1. Perimeter Defense: Block identified malicious source IP addresses at the border firewall.\n"
            "2. Identity & Access: Force credential reset and enforce multi-factor authentication for affected accounts.\n"
            "3. Endpoint Hardening: Restrict interactive shell execution permissions from web application service accounts.\n"
            "4. Detection Enhancement: Tune detection thresholds for rapid brute force and anomalous parent-child process relationships."
        )

        content_payload = {
            "incident_id": incident.id,
            "title": incident.title,
            "severity": incident.severity,
            "risk_score": incident.risk_score,
            "status": incident.status,
            "containment_status": incident.containment_status,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat(),
            "affected_assets": incident.affected_assets,
            "indicators": incident.indicators,
            "mitre_techniques": incident.mitre_techniques,
            "alerts_summary": [
                {
                    "id": a.id,
                    "rule_id": a.rule_id,
                    "title": a.title,
                    "severity": a.severity,
                    "mitre_technique_id": a.mitre_technique_id,
                    "first_seen": a.first_seen.isoformat(),
                }
                for a in alerts
            ],
            "evidence_items": [
                {
                    "id": e.id,
                    "type": e.evidence_type,
                    "description": e.description,
                    "sha256_hash": e.sha256_hash,
                    "collected_at": e.collected_at.isoformat(),
                }
                for e in evidence_items
            ],
            "investigation_notes": [
                {
                    "author": n.author_username,
                    "note": n.note_text,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notes
            ],
            "response_actions": [
                {
                    "action_type": r.action_type,
                    "target": r.target_identifier,
                    "status": r.status,
                    "executed_by": r.executed_by,
                }
                for r in actions
            ],
            "executive_summary": executive_summary,
            "root_cause": root_cause,
            "recommendations": recommendations,
        }

        # Create Report model
        report_record = Report(
            incident_id=incident.id,
            title=f"Incident Report: {incident.title}",
            report_format=format_type.upper(),
            executive_summary=executive_summary,
            root_cause=root_cause,
            recommendations=recommendations,
            content_payload=content_payload,
            generated_by=author_username,
        )
        session.add(report_record)
        await session.flush()

        # Render format
        rendered_output: Any = content_payload
        if format_type.upper() == "MARKDOWN":
            rendered_output = cls.render_markdown(content_payload)
        elif format_type.upper() == "CSV":
            rendered_output = cls.render_csv(content_payload)

        return {
            "report_id": report_record.id,
            "incident_id": incident.id,
            "title": report_record.title,
            "format": format_type.upper(),
            "created_at": report_record.created_at.isoformat(),
            "rendered_content": rendered_output,
            "payload": content_payload,
        }

    @staticmethod
    def render_markdown(data: Dict[str, Any]) -> str:
        """Renders the incident report in clean GitHub-Flavored Markdown format."""
        md = []
        md.append(f"# {data['title']}")
        md.append(f"**Incident ID:** `{data['incident_id']}` | **Severity:** `{data['severity'].upper()}` | **Risk Score:** `{data['risk_score']}/100`")
        md.append(f"**Status:** `{data['status']}` | **Containment:** `{data['containment_status']}` | **Generated:** `{datetime.now(timezone.utc).isoformat()}`\n")

        md.append("## 1. Executive Summary")
        md.append(data["executive_summary"] + "\n")

        md.append("## 2. Affected Assets & Indicators")
        md.append(f"- **Affected Assets:** {', '.join(data['affected_assets'] or ['None'])}")
        md.append(f"- **Observed Indicators (IOCs):** {', '.join(data['indicators'] or ['None'])}\n")

        md.append("## 3. MITRE ATT&CK Mapping")
        for tech in data.get("mitre_techniques", []):
            if isinstance(tech, dict):
                md.append(f"- **{tech.get('technique_id')} ({tech.get('tactic')})**: {tech.get('technique_name')}")
            else:
                md.append(f"- `{tech}`")
        md.append("")

        md.append("## 4. Correlated Alerts")
        for a in data.get("alerts_summary", []):
            md.append(f"- **[{a['severity'].upper()}]** {a['title']} (`{a['rule_id']}`) at `{a['first_seen']}`")
        md.append("")

        md.append("## 5. Evidence & Chain of Custody")
        for ev in data.get("evidence_items", []):
            md.append(f"- **Type:** `{ev['type']}` | **SHA-256:** `{ev['sha256_hash']}`")
            md.append(f"  *Description:* {ev['description']}")
        md.append("")

        md.append("## 6. Root Cause Analysis")
        md.append(data["root_cause"] + "\n")

        md.append("## 7. Remediation & Recommendations")
        md.append(data["recommendations"] + "\n")

        return "\n".join(md)

    @staticmethod
    def render_csv(data: Dict[str, Any]) -> str:
        """Renders alerts summary in CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Incident ID", "Title", "Severity", "Risk Score", "Status"])
        writer.writerow([data["incident_id"], data["title"], data["severity"], data["risk_score"], data["status"]])
        writer.writerow([])
        writer.writerow(["Alert ID", "Rule ID", "Alert Title", "Severity", "MITRE Technique", "First Seen"])
        for a in data.get("alerts_summary", []):
            writer.writerow([a["id"], a["rule_id"], a["title"], a["severity"], a["mitre_technique_id"], a["first_seen"]])
        return output.getvalue()
