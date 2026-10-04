import csv
import io
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Union, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.event import Event
from backend.app.models.alert import Alert
from backend.app.models.ioc import IOC
from backend.app.models.incident import Incident
from backend.app.models.incident_event import IncidentEvent
from backend.app.services.normalizer import LogNormalizer
from backend.app.services.detection_engine import DetectionEngine
from backend.app.services.correlation_engine import CorrelationEngine
from backend.app.services.threat_intel import threat_intel
from backend.app.api.websocket import ws_manager


class EventProcessor:
    """Core Ingestion Pipeline Orchestrator."""

    def __init__(self, detection_engine: Optional[DetectionEngine] = None):
        self.detection_engine = detection_engine or DetectionEngine()

    async def ingest_single_event(
        self,
        session: AsyncSession,
        raw_data: Dict[str, Any],
        broadcast: bool = True,
    ) -> Dict[str, Any]:
        """Processes a single raw log dictionary through normalization, detection, and correlation."""
        normalized = LogNormalizer.normalize(raw_data)

        # 1. Create and persist Event
        event_obj = Event(
            timestamp=normalized["timestamp"],
            source=normalized["source"],
            host=normalized["host"],
            event_type=normalized["event_type"],
            action=normalized["action"],
            user=normalized["user"],
            source_ip=normalized["source_ip"],
            destination_ip=normalized["destination_ip"],
            process=normalized["process"],
            severity=normalized["severity"],
            raw_message=normalized["raw_message"],
            metadata_payload=normalized["metadata_payload"],
            is_synthetic=normalized["is_synthetic"],
        )
        session.add(event_obj)
        await session.flush()

        # 2. Process and Upsert Extracted IOCs
        extracted_iocs = normalized.get("extracted_iocs", [])
        unique_iocs = {}
        for item in extracted_iocs:
            val = item.get("value")
            if val and val not in unique_iocs:
                unique_iocs[val] = item

        for val, ioc_data in unique_iocs.items():
            ioc_type = ioc_data["type"]
            # Look up threat intel
            reputation_info = {"reputation": "SUSPICIOUS", "threat_actor": "Unknown"}
            if ioc_type == "ip":
                reputation_info = threat_intel.lookup_ip(val)
            elif ioc_type == "domain":
                reputation_info = threat_intel.lookup_domain(val)
            elif ioc_type == "hash":
                reputation_info = threat_intel.lookup_hash(val)

            # Check if IOC already exists in DB
            stmt = select(IOC).where(IOC.value == val)
            res = await session.execute(stmt)
            existing_ioc = res.scalar_one_or_none()

            if existing_ioc:
                existing_ioc.last_seen = datetime.now(timezone.utc)
                existing_ioc.source_count += 1
            else:
                new_ioc = IOC(
                    ioc_type=ioc_type,
                    value=val,
                    threat_actor=reputation_info.get("threat_actor", "Unknown"),
                    reputation=reputation_info.get("reputation", "SUSPICIOUS"),
                    confidence=float(reputation_info.get("confidence", 0.8)),
                    description=reputation_info.get("description", "Extracted during log normalization."),
                    tags=reputation_info.get("tags", []),
                )
                session.add(new_ioc)
                await session.flush()

        # 3. Detection Engine Evaluation
        triggered_alerts = self.detection_engine.evaluate_event(normalized)
        persisted_alerts: List[Alert] = []
        correlated_incidents: List[Incident] = []

        for alert_dict in triggered_alerts:
            # Create Alert entity
            alert_obj = Alert(
                rule_id=alert_dict["rule_id"],
                title=alert_dict["title"],
                description=alert_dict["description"],
                severity=alert_dict["severity"],
                confidence=alert_dict["confidence"],
                source=alert_dict["source"],
                mitre_tactic=alert_dict["mitre_tactic"],
                mitre_technique_id=alert_dict["mitre_technique_id"],
                mitre_technique_name=alert_dict["mitre_technique_name"],
                first_seen=alert_dict["first_seen"],
                last_seen=alert_dict["last_seen"],
                event_count=alert_dict["event_count"],
                status="NEW",
                affected_hosts=alert_dict["affected_hosts"],
                source_ips=alert_dict["source_ips"],
                target_users=alert_dict["target_users"],
                sample_events=alert_dict["sample_events"],
            )
            session.add(alert_obj)
            await session.flush()

            # Correlate into Incident
            incident_obj = await CorrelationEngine.correlate_alert(
                session=session,
                alert_model=alert_obj,
                alert_data=alert_dict,
            )
            persisted_alerts.append(alert_obj)
            if incident_obj and incident_obj not in correlated_incidents:
                correlated_incidents.append(incident_obj)

            # Link IncidentEvent junction
            if incident_obj:
                inc_ev = IncidentEvent(
                    incident_id=incident_obj.id,
                    event_id=event_obj.id,
                )
                session.add(inc_ev)

        # 4. WebSocket Broadcast
        if broadcast:
            event_payload = event_obj.to_dict()
            await ws_manager.broadcast({
                "type": "NEW_EVENT",
                "data": event_payload,
            })

            for al in persisted_alerts:
                await ws_manager.broadcast({
                    "type": "NEW_ALERT",
                    "data": al.to_dict(),
                })

            for inc in correlated_incidents:
                await ws_manager.broadcast({
                    "type": "INCIDENT_UPDATE",
                    "data": inc.to_dict(),
                })

        return {
            "event": event_obj.to_dict(),
            "alerts": [a.to_dict() for a in persisted_alerts],
            "incidents": [i.to_dict() for i in correlated_incidents],
        }

    async def ingest_batch(
        self,
        session: AsyncSession,
        events: List[Dict[str, Any]],
        broadcast_summary: bool = True,
    ) -> Dict[str, Any]:
        """Ingests a batch list of raw events."""
        results = []
        alerts_total = 0
        incidents_total = 0

        for raw_event in events:
            res = await self.ingest_single_event(session, raw_event, broadcast=False)
            results.append(res)
            alerts_total += len(res.get("alerts", []))
            incidents_total += len(res.get("incidents", []))

        if broadcast_summary and (alerts_total > 0 or incidents_total > 0):
            await ws_manager.broadcast({
                "type": "BATCH_INGEST_SUMMARY",
                "data": {
                    "events_ingested": len(events),
                    "alerts_created": alerts_total,
                    "incidents_affected": incidents_total,
                },
            })

        return {
            "total_ingested": len(events),
            "alerts_created": alerts_total,
            "incidents_affected": incidents_total,
        }

    async def ingest_ndjson(self, session: AsyncSession, ndjson_text: str) -> Dict[str, Any]:
        """Parses and ingests newline-delimited JSON log streams."""
        events = []
        for line in ndjson_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                events.append({"raw_message": line, "source": "ndjson-stream"})
        return await self.ingest_batch(session, events)

    async def ingest_csv(self, session: AsyncSession, csv_text: str) -> Dict[str, Any]:
        """Parses and ingests CSV log streams."""
        events = []
        reader = csv.DictReader(io.StringIO(csv_text))
        for row in reader:
            events.append(dict(row))
        return await self.ingest_batch(session, events)


# Global event processor singleton
event_processor = EventProcessor()
