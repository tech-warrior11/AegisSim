from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, Boolean, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, utc_now


class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g., CR-AUTH-001
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # authentication, web, endpoint, network, privilege
    severity: Mapped[str] = mapped_column(String(32), default="medium")  # info, low, medium, high, critical
    mitre_tactic: Mapped[str] = mapped_column(String(128), default="Discovery")
    mitre_technique_id: Mapped[str] = mapped_column(String(32), default="T1046")
    mitre_technique_name: Mapped[str] = mapped_column(String(128), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    rule_yaml: Mapped[str] = mapped_column(Text, nullable=False)
    rule_parsed: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
