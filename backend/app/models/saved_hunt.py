from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, generate_uuid, utc_now


class SavedHunt(Base):
    __tablename__ = "saved_hunts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    query_dsl: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)  # JSON representation of filters
    created_by: Mapped[str] = mapped_column(String(64), default="SOC_ANALYST")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    match_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
