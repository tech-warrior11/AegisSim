from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.event import Event
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.models.incident_event import IncidentEvent
from backend.app.models.investigation_note import InvestigationNote
from backend.app.models.response_action import ResponseAction


class TimelineService:
    """Generates comprehensive chronological timelines for incidents and host investigations."""

    @classmethod
    async def get_incident_timeline(
        cls,
        session: AsyncSession,
        incident_id: str,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        """
        Assembles all linked events, alerts, analyst notes, and response actions into a unified chronological sequence.
        """
        timeline_items: List[Dict[str, Any]] = []

        # 1. Fetch Incident details
        inc_stmt = select(Incident).where(Incident.id == incident_id)
        inc_res = await session.execute(inc_stmt)
        incident = inc_res.scalar_one_or_none()
        if not incident:
            return []

        # 2. Fetch Alerts linked to Incident
        alert_stmt = select(Alert).where(Alert.incident_id == incident_id)
        alert_res = await session.execute(alert_stmt)
        for alert in alert_res.scalars().all():
            timeline_items.append({
                "id": alert.id,
                "item_type": "ALERT",
                "timestamp": alert.first_seen,
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity,
                "mitre_tactic": alert.mitre_tactic,
                "mitre_technique_id": alert.mitre_technique_id,
                "mitre_technique_name": alert.mitre_technique_name,
                "host": alert.affected_hosts[0] if alert.affected_hosts else None,
                "source_ip": alert.source_ips[0] if alert.source_ips else None,
                "user": alert.target_users[0] if alert.target_users else None,
                "details": {
                    "rule_id": alert.rule_id,
                    "confidence": alert.confidence,
                    "event_count": alert.event_count,
                    "status": alert.status,
                },
            })

        # 3. Fetch Events linked to Incident via junction table
        event_stmt = (
            select(Event)
            .join(IncidentEvent, IncidentEvent.event_id == Event.id)
            .where(IncidentEvent.incident_id == incident_id)
            .order_by(Event.timestamp.asc())
            .limit(limit)
        )
        event_res = await session.execute(event_stmt)
        for ev in event_res.scalars().all():
            timeline_items.append({
                "id": ev.id,
                "item_type": "EVENT",
                "timestamp": ev.timestamp,
                "title": f"{ev.event_type.capitalize()} - {ev.action}",
                "description": ev.raw_message,
                "severity": ev.severity,
                "mitre_tactic": None,
                "mitre_technique_id": None,
                "mitre_technique_name": None,
                "host": ev.host,
                "source_ip": ev.source_ip,
                "user": ev.user,
                "details": {
                    "source": ev.source,
                    "process": ev.process,
                    "destination_ip": ev.destination_ip,
                    "metadata": ev.metadata_payload,
                },
            })

        # 4. Fetch Analyst Notes
        notes_stmt = select(InvestigationNote).where(InvestigationNote.incident_id == incident_id)
        notes_res = await session.execute(notes_stmt)
        for note in notes_res.scalars().all():
            timeline_items.append({
                "id": note.id,
                "item_type": "NOTE",
                "timestamp": note.created_at,
                "title": f"Analyst Note by {note.author_username}",
                "description": note.note_text,
                "severity": "info",
                "mitre_tactic": None,
                "mitre_technique_id": None,
                "mitre_technique_name": None,
                "host": None,
                "source_ip": None,
                "user": note.author_username,
                "details": {"author": note.author_username},
            })

        # 5. Fetch Evidence
        from backend.app.models.evidence import Evidence
        ev_stmt = select(Evidence).where(Evidence.incident_id == incident_id)
        ev_res = await session.execute(ev_stmt)
        for ev in ev_res.scalars().all():
            timeline_items.append({
                "id": ev.id,
                "item_type": "EVIDENCE",
                "timestamp": ev.collected_at,
                "title": f"Evidence Collected ({ev.evidence_type.upper()}): {ev.description[:40]}...",
                "description": f"SHA-256: {ev.sha256_hash} | Reference: {ev.source_reference or 'Direct capture'}",
                "severity": "low",
                "mitre_tactic": None,
                "mitre_technique_id": None,
                "mitre_technique_name": None,
                "host": None,
                "source_ip": None,
                "user": ev.collected_by,
                "details": {
                    "type": ev.evidence_type,
                    "sha256": ev.sha256_hash,
                    "collected_by": ev.collected_by,
                },
            })

        # 6. Fetch Response Actions
        resp_stmt = select(ResponseAction).where(ResponseAction.incident_id == incident_id)
        resp_res = await session.execute(resp_stmt)
        for act in resp_res.scalars().all():
            timeline_items.append({
                "id": act.id,
                "item_type": "RESPONSE_ACTION",
                "timestamp": act.executed_at,
                "title": f"Playbook Action: {act.action_type}",
                "description": act.description,
                "severity": "medium",
                "mitre_tactic": None,
                "mitre_technique_id": None,
                "mitre_technique_name": None,
                "host": None,
                "source_ip": None,
                "user": act.executed_by,
                "details": {
                    "target": act.target_identifier,
                    "status": act.status,
                    "result": act.result_summary,
                },
            })

        # Sort chronologically
        timeline_items.sort(key=lambda x: x["timestamp"] if isinstance(x["timestamp"], datetime) else datetime.min)
        return timeline_items
