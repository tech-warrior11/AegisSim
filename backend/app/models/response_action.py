from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class ResponseAction(Base):
    __tablename__ = "response_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)  # isolate_host, block_ip, disable_user, terminate_process, rollback
    description: Mapped[str] = mapped_column(Text, nullable=False)
    target_identifier: Mapped[str] = mapped_column(String(256), nullable=False)  # e.g., IP, host, username
    status: Mapped[str] = mapped_column(String(32), default="SUCCESS")  # PENDING, EXECUTING, SUCCESS, FAILED
    executed_by: Mapped[str] = mapped_column(String(64), default="SOC_ANALYST")
    result_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    incident = relationship("Incident", back_populates="response_actions")
