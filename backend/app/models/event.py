from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, DateTime, JSON, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, generate_uuid, utc_now


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=utc_now)
    source: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # e.g., linux-auth, nginx, auditd, zeek, sysmon
    host: Mapped[str] = mapped_column(String(128), index=True, nullable=False, default="lab-host-01")
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # authentication, web, endpoint, network, privilege, dns, file, process
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # login_failed, login_success, http_request, process_create, port_scan, etc.
    user: Mapped[Optional[str]] = mapped_column(String(128), index=True, nullable=True)
    source_ip: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    destination_ip: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    process: Mapped[Optional[str]] = mapped_column(String(256), index=True, nullable=True)
    severity: Mapped[str] = mapped_column(String(32), index=True, default="low")  # info, low, medium, high, critical
    raw_message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("idx_events_source_ip_ts", "source_ip", "timestamp"),
        Index("idx_events_host_ts", "host", "timestamp"),
        Index("idx_events_user_ts", "user", "timestamp"),
        Index("idx_events_type_action", "event_type", "action"),
    )
