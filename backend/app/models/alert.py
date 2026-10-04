from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, Float, DateTime, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    rule_id: Mapped[str] = mapped_column(String(64), ForeignKey("detection_rules.id", ondelete="CASCADE"), index=True, nullable=False)
    incident_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(32), index=True, default="medium")  # info, low, medium, high, critical
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    source: Mapped[str] = mapped_column(String(64), default="detection-engine")
    mitre_tactic: Mapped[str] = mapped_column(String(128), default="Discovery")
    mitre_technique_id: Mapped[str] = mapped_column(String(32), default="T1046")
    mitre_technique_name: Mapped[str] = mapped_column(String(128), default="")
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    event_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), index=True, default="NEW")  # NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    affected_hosts: Mapped[List[str]] = mapped_column(JSON, default=list)
    source_ips: Mapped[List[str]] = mapped_column(JSON, default=list)
    target_users: Mapped[List[str]] = mapped_column(JSON, default=list)
    sample_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=utc_now)

    # Relationships
    detection_rule = relationship("DetectionRule", lazy="selectin")
    incident = relationship("Incident", back_populates="alerts", lazy="selectin")
