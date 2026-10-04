import hashlib
import os
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.evidence import Evidence


class EvidenceService:
    """Manages cryptographic evidence collection, hashing, and chain-of-custody verification."""

    @staticmethod
    def calculate_hash(content: bytes) -> str:
        """Calculates SHA-256 digest of bytes payload."""
        return hashlib.sha256(content).hexdigest()

    @classmethod
    async def add_evidence(
        cls,
        session: AsyncSession,
        incident_id: str,
        evidence_type: str,
        description: str,
        content_bytes: Optional[bytes] = None,
        raw_text: Optional[str] = None,
        source_reference: Optional[str] = None,
        collected_by: str = "SOC_ANALYST",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Evidence:
        """Creates and stores an Evidence record with a verified SHA-256 hash."""
        if content_bytes is None:
            content_bytes = (raw_text or description).encode("utf-8")

        sha256 = cls.calculate_hash(content_bytes)

        evidence_obj = Evidence(
            incident_id=incident_id,
            evidence_type=evidence_type,
            description=description,
            sha256_hash=sha256,
            source_reference=source_reference,
            collected_by=collected_by,
            metadata_payload=metadata or {},
        )
        session.add(evidence_obj)
        await session.flush()
        return evidence_obj
