from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Float, DateTime, JSON, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, generate_uuid, utc_now


class IOC(Base):
    __tablename__ = "iocs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ioc_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # ip, domain, url, hash, username, filepath
    value: Mapped[str] = mapped_column(String(512), unique=True, index=True, nullable=False)
    threat_actor: Mapped[Optional[str]] = mapped_column(String(128), default="Unknown")
    reputation: Mapped[str] = mapped_column(String(32), index=True, default="SUSPICIOUS")  # CLEAN, SUSPICIOUS, MALICIOUS, UNKNOWN
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    source_count: Mapped[int] = mapped_column(default=1)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
