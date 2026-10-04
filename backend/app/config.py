import os
from pathlib import Path
from functools import lru_cache
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _resolve_project_path(rel_path: str) -> str:
    if os.path.exists(rel_path):
        return os.path.abspath(rel_path)
    alt = PROJECT_ROOT / rel_path.lstrip("./\\")
    if alt.exists():
        return str(alt)
    return rel_path


class Settings(BaseSettings):
    PROJECT_NAME: str = "AegisSim - Attack Detection & Investigation Lab"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

    # Security & JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.urandom(32).hex())
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 480

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./AegisSim.db"

    # Redis Cache / PubSub
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "*"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # File & Evidence Storage
    UPLOAD_MAX_MB: int = 25
    EVIDENCE_STORAGE_PATH: str = "./data/evidence"

    # Engine Paths
    DETECTION_RULES_PATH: str = "./detection-rules"
    SCENARIOS_PATH: str = "./data/attack-scenarios"
    IOC_DB_PATH: str = "./data/sample-iocs/ioc_reputation_db.json"

    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_HUNT: str = "60/minute"
    RATE_LIMIT_SIMULATION: str = "20/minute"

    @field_validator("DETECTION_RULES_PATH", "SCENARIOS_PATH", "IOC_DB_PATH", "EVIDENCE_STORAGE_PATH", mode="after")
    @classmethod
    def resolve_paths(cls, v: str) -> str:
        return _resolve_project_path(v)

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

