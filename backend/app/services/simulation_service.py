import os
import glob
import time
import yaml
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.config import get_settings
from backend.app.models.scenario import ScenarioRun
from backend.app.models.incident import Incident
from backend.app.models.alert import Alert
from backend.app.services.event_processor import event_processor
from backend.app.api.websocket import ws_manager


class SimulationService:
    """Orchestrates safe, contained attack simulations against local lab targets."""

    def __init__(self, scenarios_dir: Optional[str] = None):
        settings = get_settings()
        self.scenarios_dir = scenarios_dir or settings.SCENARIOS_PATH
        self.scenarios: Dict[str, Dict[str, Any]] = {}
        self.load_scenarios()

    def load_scenarios(self) -> int:
        """Loads all scenario YAML definitions."""
        self.scenarios.clear()
        target_dir = self.scenarios_dir
        if not os.path.exists(target_dir):
            alt = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/attack-scenarios"))
            if os.path.exists(alt):
                target_dir = alt
            elif os.path.exists(os.path.join("..", target_dir)):
                target_dir = os.path.join("..", target_dir)

        yaml_files = glob.glob(os.path.join(target_dir, "*.yaml")) + \
                     glob.glob(os.path.join(target_dir, "*.yml"))

        for path in yaml_files:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if data and "id" in data:
                        self.scenarios[data["id"]] = data
            except Exception as e:
                print(f"Failed to load scenario {path}: {e}")

        return len(self.scenarios)

    def list_scenarios(self) -> List[Dict[str, Any]]:
        """Returns catalog of available simulation scenarios."""
        self.load_scenarios()
        summary = []
        for s_id, s in self.scenarios.items():
            summary.append({
                "id": s.get("id"),
                "name": s.get("name"),
                "description": s.get("description"),
                "category": s.get("category"),
                "severity": s.get("severity"),
                "stages_count": len(s.get("stages", [])),
                "expected_detections": s.get("expected_detections", []),
                "expected_mitre": s.get("expected_mitre", []),
                "expected_risk_range": s.get("expected_risk_range", {}),
                "target": s.get("target", {}),
            })
        return summary

    async def execute_scenario(
        self,
        session: AsyncSession,
        scenario_id: str,
        actor_username: str = "SOC_ANALYST",
    ) -> Dict[str, Any]:
        """Executes an attack scenario end-to-end and returns live metrics."""
        self.load_scenarios()
        scenario = self.scenarios.get(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario '{scenario_id}' not found in catalog.")

        start_time = time.time()
        now = datetime.now(timezone.utc)

        target_cfg = scenario.get("target", {})
        target_host = target_cfg.get("host", "lab-linux-01")
        target_user = target_cfg.get("target_user", "admin")
        source_ip = target_cfg.get("source_ip", "10.10.10.50")

        # Create ScenarioRun record
        run_record = ScenarioRun(
            scenario_id=scenario_id,
            scenario_name=scenario.get("name", scenario_id),
            status="RUNNING",
            target_host=target_host,
            target_user=target_user,
            source_ip=source_ip,
            started_at=now,
        )
        session.add(run_record)
        await session.flush()

        await ws_manager.broadcast({
            "type": "SIMULATION_STARTED",
            "data": {
                "run_id": run_record.id,
                "scenario_id": scenario_id,
                "name": scenario.get("name"),
            },
        })

        events_generated = 0
        detections_triggered = 0
        all_alerts_created = []
        all_incidents_affected = []
        execution_log = []

        stages = scenario.get("stages", [])
        for stage in stages:
            stage_name = stage if isinstance(stage, str) else stage.get("name", "Unknown Stage")
            execution_log.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stage": stage_name,
                "status": "EXECUTING",
            })
            
            events = [] if isinstance(stage, str) else stage.get("events", [])
            for ev_template in events:
                repeat_count = ev_template.get("repeat", 1)
                for _ in range(repeat_count):
                    # Build event payload
                    ev_data = {
                        "source": ev_template.get("source", "lab-agent"),
                        "host": ev_template.get("host", target_host),
                        "event_type": ev_template.get("event_type", "security"),
                        "action": ev_template.get("action", "generic"),
                        "user": ev_template.get("user", target_user),
                        "source_ip": ev_template.get("source_ip", source_ip),
                        "destination_ip": ev_template.get("destination_ip"),
                        "process": ev_template.get("process"),
                        "raw_message": ev_template.get("raw_message", ""),
                        "metadata": ev_template.get("metadata", {}),
                        "is_synthetic": True,
                    }

                    # Ingest single event
                    res = await event_processor.ingest_single_event(session, ev_data, broadcast=True)
                    events_generated += 1

                    alerts = res.get("alerts", [])
                    if alerts:
                        detections_triggered += len(alerts)
                        all_alerts_created.extend(alerts)

                    for inc in res.get("incidents", []):
                        if inc["id"] not in [i["id"] for i in all_incidents_affected]:
                            all_incidents_affected.append(inc)

            # Micro-pause between stages to simulate progressive adversary behavior
            await asyncio.sleep(0.05)

        duration = round(time.time() - start_time, 2)
        primary_incident_id = all_incidents_affected[0]["id"] if all_incidents_affected else None

        # Determine aggregate MITRE techniques and risk score
        mitre_techs = []
        final_risk = 0
        if primary_incident_id:
            stmt = select(Incident).where(Incident.id == primary_incident_id)
            res = await session.execute(stmt)
            primary_inc = res.scalar_one_or_none()
            if primary_inc:
                mitre_techs = [
                    t.get("technique_id") if isinstance(t, dict) else str(t)
                    for t in (primary_inc.mitre_techniques or [])
                ]
                final_risk = primary_inc.risk_score

        # Complete run record
        run_record.status = "COMPLETED"
        run_record.duration_seconds = duration
        run_record.events_generated = events_generated
        run_record.detections_triggered = detections_triggered
        run_record.alerts_generated = len(all_alerts_created)
        run_record.incident_id = primary_incident_id
        run_record.mitre_techniques = mitre_techs
        run_record.risk_score = final_risk
        run_record.completed_at = datetime.now(timezone.utc)
        run_record.execution_log = execution_log

        await session.flush()

        result_summary = {
            "run_id": run_record.id,
            "scenario_id": scenario_id,
            "scenario_name": scenario.get("name"),
            "status": "COMPLETED",
            "duration_seconds": duration,
            "events_generated": events_generated,
            "detections_triggered": detections_triggered,
            "alerts_generated": len(all_alerts_created),
            "incidents_created": len(all_incidents_affected),
            "primary_incident_id": primary_incident_id,
            "mitre_techniques": mitre_techs,
            "risk_score": final_risk,
        }

        await ws_manager.broadcast({
            "type": "SIMULATION_COMPLETED",
            "data": result_summary,
        })

        return result_summary


simulation_service = SimulationService()
