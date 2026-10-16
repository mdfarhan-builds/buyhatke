from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PRICEWISE_", extra="ignore", env_file=Path(__file__).resolve().parents[3] / ".env"
    )

    environment: str = "development"
    feed_path: Path | None = None
    max_age_seconds: int = Field(default=900, ge=30, le=86400)
    cache_ttl_seconds: int = Field(default=30, ge=1, le=300)
    rate_limit_per_minute: int = Field(default=30, ge=1, le=1000)
    redis_url: str | None = None
    database_url: str | None = None
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
