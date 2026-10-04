from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, generate_uuid, utc_now


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_username: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # login, logout, ack_alert, update_incident, run_simulation, upload_evidence, etc.
    resource_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # alert, incident, detection_rule, evidence, simulation, user
    resource_id: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    client_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=utc_now)
