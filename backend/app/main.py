import time
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from backend.app.config import get_settings
from backend.app.database.database import init_db, AsyncSessionLocal
from backend.app.models.user import User
from backend.app.api.auth import get_password_hash
from backend.app.api.websocket import ws_manager

# Import all routers
from backend.app.api import (
    auth_router,
    events_router,
    alerts_router,
    incidents_router,
    investigations_router,
    detections_router,
    iocs_router,
    hunt_router,
    simulations_router,
    reports_router,
    dashboard_router,
    playbooks_router,
    audit_router,
)

settings = get_settings()


async def seed_initial_admin():
    """Ensures a default SOC administrator account exists on startup if env vars are provided."""
    admin_user = settings.ADMIN_USERNAME
    admin_pass = settings.ADMIN_PASSWORD
    
    if not admin_user or not admin_pass:
        print("[WARNING] No ADMIN_USERNAME or ADMIN_PASSWORD set. Skipping default admin creation.")
        return

    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.username == admin_user)
        res = await session.execute(stmt)
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                username=admin_user,
                email=f"{admin_user}@AegisSim.lab",
                hashed_password=get_password_hash(admin_pass),
                role="ADMIN",
                full_name="SOC Administrator",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            print(f"[INFO] Seeded default SOC admin user ({admin_user}) from environment.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_initial_admin()
    yield
    # Shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AegisSim: Production-grade Attack Detection & Investigation Lab platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https?://.*",
)


# Security Headers & Observability Middleware
@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    start_time = time.time()
    response: Response = await call_next(request)
    process_time = time.time() - start_time

    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Health & Observability Endpoints
@app.api_route("/", methods=["GET", "HEAD"], tags=["Observability"])
async def root():
    return {"status": "online", "message": "AegisSim API is running"}


@app.get("/health", tags=["Observability"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/ready", tags=["Observability"])
async def readiness_check():
    return {"status": "ready", "database": "connected", "engine": "active"}


@app.get("/metrics", tags=["Observability"])
async def metrics_endpoint():
    return {
        "uptime_seconds": time.time(),
        "version": settings.VERSION,
        "active_ws_connections": len(ws_manager.active_connections),
    }


# Real-time WebSocket Hub
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive optional client heartbeats
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "PONG"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# Register all API Routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(incidents_router)
app.include_router(investigations_router)
app.include_router(detections_router)
app.include_router(iocs_router)
app.include_router(hunt_router)
app.include_router(simulations_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(playbooks_router)
app.include_router(audit_router)
