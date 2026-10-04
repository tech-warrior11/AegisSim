from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.models.incident_event import IncidentEvent
from backend.app.services.risk_engine import RiskScoringEngine


class CorrelationEngine:
    """
    Correlates alerts into high-context Incidents based on shared entities
    (IP, host, username), temporal proximity, and MITRE progression.
    """

    CORRELATION_WINDOW_MINUTES = 30

    @classmethod
    def generate_correlation_key(cls, alert: Dict[str, Any]) -> str:
        """Constructs a deterministic correlation key from alert entities."""
        src_ips = sorted(alert.get("source_ips") or [])
        hosts = sorted(alert.get("affected_hosts") or [])
        users = sorted(alert.get("target_users") or [])

        ip_part = src_ips[0] if src_ips else "none"
        host_part = hosts[0] if hosts else "none"
        user_part = users[0] if users else "none"

        return f"CORR-IP-{ip_part}-HOST-{host_part}"

    @classmethod
    async def correlate_alert(
        cls,
        session: AsyncSession,
        alert_model: Alert,
        alert_data: Dict[str, Any],
    ) -> Incident:
        """
        Correlates an Alert model instance into an existing active incident or creates a new one.
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=cls.CORRELATION_WINDOW_MINUTES)
        corr_key = cls.generate_correlation_key(alert_data)

        src_ips = alert_data.get("source_ips") or []
        hosts = alert_data.get("affected_hosts") or []
        users = alert_data.get("target_users") or []

        # Find existing active incident (OPEN or INVESTIGATING) matching correlation_key or shared IP/host
        stmt = select(Incident).where(
            and_(
                Incident.status.in_(["OPEN", "INVESTIGATING", "CONTAINED"]),
                or_(
                    Incident.correlation_id == corr_key,
                    Incident.created_at >= window_start,
                ),
            )
        ).order_by(Incident.updated_at.desc())

        result = await session.execute(stmt)
        candidates = result.scalars().all()

        matching_incident: Optional[Incident] = None
        for inc in candidates:
            # Check for entity overlap
            if inc.correlation_id == corr_key:
                matching_incident = inc
                break
            # Check host overlap
            if any(h in (inc.affected_assets or []) for h in hosts):
                matching_incident = inc
                break
            # Check IP overlap
            if any(ip in (inc.indicators or []) for ip in src_ips):
                matching_incident = inc
                break

        if matching_incident:
            # Update existing incident
            alert_model.incident_id = matching_incident.id
            matching_incident.updated_at = now

            # Merge assets
            current_assets = set(matching_incident.affected_assets or [])
            current_assets.update(hosts)
            matching_incident.affected_assets = list(current_assets)

            # Merge indicators
            current_indicators = set(matching_incident.indicators or [])
            current_indicators.update(src_ips)
            current_indicators.update(users)
            matching_incident.indicators = list(current_indicators)

            # Merge MITRE techniques
            existing_mitre = matching_incident.mitre_techniques or []
            new_technique_id = alert_data.get("mitre_technique_id")
            if new_technique_id and not any(t.get("technique_id") == new_technique_id for t in existing_mitre):
                existing_mitre.append({
                    "tactic": alert_data.get("mitre_tactic", "Discovery"),
                    "technique_id": new_technique_id,
                    "technique_name": alert_data.get("mitre_technique_name", ""),
                })
                matching_incident.mitre_techniques = list(existing_mitre)

            # Recalculate Risk Score
            # Fetch all alerts attached to this incident
            alert_stmt = select(Alert).where(Alert.incident_id == matching_incident.id)
            alert_res = await session.execute(alert_stmt)
            all_incident_alerts = [a.to_dict() for a in alert_res.scalars().all()]
            all_incident_alerts.append(alert_data)

            all_tactics = [t.get("tactic") for t in matching_incident.mitre_techniques if isinstance(t, dict)]
            new_risk = RiskScoringEngine.calculate_incident_risk(
                alerts=all_incident_alerts,
                affected_assets=matching_incident.affected_assets,
                mitre_tactics=all_tactics,
            )
            matching_incident.risk_score = new_risk
            matching_incident.severity = RiskScoringEngine.get_risk_category(new_risk)

            await session.flush()
            return matching_incident

        else:
            # Create a brand new incident
            title_prefix = f"Suspicious Activity on {hosts[0]}" if hosts else "Security Intrusion Indicator"
            if alert_data.get("mitre_tactic"):
                title = f"{alert_data['mitre_tactic']} Alert: {alert_data.get('title', 'Security Incident')}"
            else:
                title = f"Security Incident: {alert_data.get('title', 'Detected Threat')}"

            mitre_list = []
            if alert_data.get("mitre_technique_id"):
                mitre_list.append({
                    "tactic": alert_data.get("mitre_tactic", "Discovery"),
                    "technique_id": alert_data.get("mitre_technique_id"),
                    "technique_name": alert_data.get("mitre_technique_name", ""),
                })

            indicators = list(set(src_ips + users))
            initial_risk = RiskScoringEngine.calculate_incident_risk(
                alerts=[alert_data],
                affected_assets=hosts,
                mitre_tactics=[alert_data.get("mitre_tactic", "Discovery")],
            )

            new_incident = Incident(
                title=title,
                description=f"Correlated security incident initiated by alert '{alert_data.get('title')}'.",
                severity=RiskScoringEngine.get_risk_category(initial_risk),
                risk_score=initial_risk,
                status="OPEN",
                correlation_id=corr_key,
                affected_assets=hosts,
                mitre_techniques=mitre_list,
                indicators=indicators,
                containment_status="NOT_CONTAINED",
            )
            session.add(new_incident)
            await session.flush()

            # Attach alert
            alert_model.incident_id = new_incident.id
            await session.flush()

            return new_incident
