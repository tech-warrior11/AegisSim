from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.audit_log import AuditLog


class AuditService:
    """Centralized Audit Logging Service for compliance and analyst traceability."""

    @staticmethod
    async def log_action(
        session: AsyncSession,
        actor_username: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Records an immutable audit log entry."""
        log_entry = AuditLog(
            actor_username=actor_username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            client_ip=client_ip,
            description=description or f"User {actor_username} performed {action} on {resource_type}",
            metadata_payload=metadata or {},
            timestamp=datetime.now(timezone.utc),
        )
        session.add(log_entry)
        await session.flush()
        return log_entry
