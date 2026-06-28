import secrets
import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


def _generate_secret_key() -> str:
    """Generate a cryptographically secure 256-bit secret key for JWT signing."""
    return secrets.token_urlsafe(64)


# Auto-generate a strong default so the app never runs with a guessable secret
_DEFAULT_SECRET = _generate_secret_key()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "AI Complaint Management Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False  # SECURITY: Default to False; only enable via .env

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aicmp:aicmp_secret@localhost:5432/ai_cmp"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security — auto-generated strong secret; override via SECRET_KEY in .env
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # SECURITY: Reduced from 30 to 15 (guide recommends ≤15)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: str = "image/jpeg,image/png,application/pdf,text/plain"

    # SLA (hours)
    SLA_HOURS_DEFAULT: int = 72
    SLA_HOURS_HIGH_PRIORITY: int = 24
    SLA_HOURS_CRITICAL: int = 8

    # Escalation
    ESCALATION_CHECK_INTERVAL_MINUTES: int = 30

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod", "staging")

    @property
    def allowed_mime_types_list(self) -> List[str]:
        return [m.strip() for m in self.ALLOWED_MIME_TYPES.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()

# ─── Startup Security Warnings ──────────────────────────────────────────────
if settings.is_production and settings.SECRET_KEY == _DEFAULT_SECRET:
    warnings.warn(
        "⚠️  SECURITY: SECRET_KEY is auto-generated. Set a persistent SECRET_KEY in .env "
        "for production, otherwise all sessions will be invalidated on restart.",
        stacklevel=1,
    )
if settings.is_production and "aicmp_secret" in settings.DATABASE_URL:
    warnings.warn(
        "⚠️  SECURITY: DATABASE_URL contains default credentials. "
        "Set a strong DATABASE_URL in .env for production.",
        stacklevel=1,
    )
