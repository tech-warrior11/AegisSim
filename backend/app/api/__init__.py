from backend.app.api.auth import router as auth_router
from backend.app.api.events import router as events_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.investigations import router as investigations_router
from backend.app.api.detections import router as detections_router
from backend.app.api.iocs import router as iocs_router
from backend.app.api.hunt import router as hunt_router
from backend.app.api.simulations import router as simulations_router
from backend.app.api.reports import router as reports_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.playbooks import router as playbooks_router
from backend.app.api.audit import router as audit_router
from backend.app.api.websocket import ws_manager

__all__ = [
    "auth_router",
    "events_router",
    "alerts_router",
    "incidents_router",
    "investigations_router",
    "detections_router",
    "iocs_router",
    "hunt_router",
    "simulations_router",
    "reports_router",
    "dashboard_router",
    "playbooks_router",
    "audit_router",
    "ws_manager",
]
