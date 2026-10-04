from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, generate_uuid, utc_now


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    scenario_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # e.g., SCENARIO-007
    scenario_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="RUNNING")  # RUNNING, COMPLETED, FAILED
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    events_generated: Mapped[int] = mapped_column(Integer, default=0)
    detections_triggered: Mapped[int] = mapped_column(Integer, default=0)
    alerts_generated: Mapped[int] = mapped_column(Integer, default=0)
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    mitre_techniques: Mapped[List[str]] = mapped_column(JSON, default=list)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    target_host: Mapped[str] = mapped_column(String(128), default="lab-linux-01")
    target_user: Mapped[str] = mapped_column(String(64), default="admin")
    source_ip: Mapped[str] = mapped_column(String(64), default="10.10.10.50")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_log: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
