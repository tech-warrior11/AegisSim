from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    incident_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    report_format: Mapped[str] = mapped_column(String(32), default="JSON")  # JSON, PDF, CSV, MARKDOWN
    executive_summary: Mapped[str] = mapped_column(Text, default="")
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    generated_by: Mapped[str] = mapped_column(String(64), default="SOC_ANALYST")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    incident = relationship("Incident", back_populates="reports")
