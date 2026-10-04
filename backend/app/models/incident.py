from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, DateTime, JSON, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, generate_uuid, utc_now


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(32), index=True, default="medium")  # info, low, medium, high, critical
    risk_score: Mapped[int] = mapped_column(Integer, index=True, default=50)  # 0 to 100
    status: Mapped[str] = mapped_column(String(32), index=True, default="OPEN")  # OPEN, INVESTIGATING, CONTAINED, ERADICATION, RECOVERY, CLOSED
    correlation_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    assigned_to_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    affected_assets: Mapped[List[str]] = mapped_column(JSON, default=list)
    mitre_techniques: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    indicators: Mapped[List[str]] = mapped_column(JSON, default=list)
    containment_status: Mapped[str] = mapped_column(String(64), default="NOT_CONTAINED")
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], lazy="selectin")
    alerts = relationship("Alert", back_populates="incident", lazy="selectin", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="incident", lazy="selectin", cascade="all, delete-orphan")
    investigation_notes = relationship("InvestigationNote", back_populates="incident", lazy="selectin", cascade="all, delete-orphan")
    response_actions = relationship("ResponseAction", back_populates="incident", lazy="selectin", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="incident", lazy="selectin", cascade="all, delete-orphan")
