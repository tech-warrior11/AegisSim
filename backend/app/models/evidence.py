from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # log, screenshot, ioc, event, report, analyst_note
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    source_reference: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    incident = relationship("Incident", back_populates="evidence_items")
