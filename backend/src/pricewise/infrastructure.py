"""Optional Redis/PostgreSQL with explicit, bounded development fallbacks."""

import asyncio
import logging
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from .config import Settings

logger = logging.getLogger(__name__)
metadata = MetaData()
audit_table = Table(
    "pricewise_comparison_audit", metadata,
    Column("id", String(36), primary_key=True),
    Column("retailer", String(40), nullable=False),
    Column("outcome", String(20), nullable=False),
    Column("verified_count", Integer, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)


class Infrastructure:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis: Redis | None = None
        self.engine: AsyncEngine | None = None
        self.cache_mode = "development_memory"
        self.audit_mode = "development_memory"
        self._cache: dict[str, tuple[float, str]] = {}
        self._rates: dict[str, tuple[int, int]] = {}
        self._lock = asyncio.Lock()
        self._audit: deque[dict[str, Any]] = deque(maxlen=100)

    async def start(self) -> None:
        if self.settings.redis_url:
            try:
                self.redis = Redis.from_url(self.settings.redis_url, socket_connect_timeout=1, socket_timeout=1, decode_responses=True)
                await self.redis.ping()
                self.cache_mode = "redis"
            except Exception:
                logger.warning("Redis unavailable; using bounded development memory cache and rate limiter")
                if self.redis:
                    await self.redis.aclose()
                self.redis = None
                self.cache_mode = "development_memory_fallback"
        if self.settings.database_url:
            try:
                if not self.settings.database_url.startswith("postgresql+asyncpg://"):
                    raise ValueError("PostgreSQL asyncpg URL required")
                self.engine = create_async_engine(self.settings.database_url, pool_size=2, max_overflow=2, connect_args={"timeout": 2})
                await asyncio.wait_for(self._initialize_database(), timeout=4)
                self.audit_mode = "postgresql"
            except Exception:
                logger.warning("PostgreSQL unavailable; comparison audit uses development memory")
                if self.engine:
                    await self.engine.dispose()
                self.engine = None
                self.audit_mode = "development_memory_fallback"

    async def _initialize_database(self) -> None:
        assert self.engine is not None
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)

    async def close(self) -> None:
        if self.redis:
            await self.redis.aclose()
        if self.engine:
            await self.engine.dispose()

    async def _disable_redis(self) -> None:
        self.cache_mode = "development_memory_fallback"
        if self.redis:
            await self.redis.aclose()
            self.redis = None
        logger.warning("Redis connection lost; using development memory")

    async def allowed(self, client_key: str) -> bool:
        bucket = int(time.time() // 60)
        key = f"pricewise:rate:{client_key}:{bucket}"
        if self.redis:
            try:
                count = await self.redis.eval(
                    "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], 61) end; return count",
                    1, key,
                )
                return int(count) <= self.settings.rate_limit_per_minute
            except Exception:
                await self._disable_redis()
        async with self._lock:
            previous_bucket, previous_count = self._rates.get(client_key, (bucket, 0))
            count = previous_count + 1 if previous_bucket == bucket else 1
            self._rates[client_key] = (bucket, count)
            if len(self._rates) > 10000:
                self._rates = {key: value for key, value in self._rates.items() if value[0] == bucket}
                if len(self._rates) > 10000:
                    # Reject excess new clients instead of growing the local fallback without limit.
                    self._rates.pop(client_key, None)
                    return False
            return count <= self.settings.rate_limit_per_minute

    async def cache_get(self, key: str) -> str | None:
        if self.redis:
            try:
                return await self.redis.get(f"pricewise:comparison:{key}")
            except Exception:
                await self._disable_redis()
        stored = self._cache.get(key)
        if stored and stored[0] > time.monotonic():
            return stored[1]
        self._cache.pop(key, None)
        return None

    async def cache_set(self, key: str, value: str) -> None:
        if self.redis:
            try:
                await self.redis.setex(f"pricewise:comparison:{key}", self.settings.cache_ttl_seconds, value)
                return
            except Exception:
                await self._disable_redis()
        if len(self._cache) >= 512:
            self._cache.pop(next(iter(self._cache)))
        self._cache[key] = (time.monotonic() + self.settings.cache_ttl_seconds, value)

    async def audit(self, retailer: str, outcome: str, count: int) -> None:
        # No submitted URL, IP address, product details, or credentials are persisted.
        record = {"id": str(uuid.uuid4()), "retailer": retailer, "outcome": outcome, "verified_count": count, "created_at": datetime.now(timezone.utc)}
        if self.engine:
            try:
                await asyncio.wait_for(self._write_audit(record), timeout=3)
                self.audit_mode = "postgresql"
                return
            except Exception:
                self.audit_mode = "development_memory_fallback"
                logger.warning("Comparison audit write failed; using development memory")
        self._audit.append(record)

    async def _write_audit(self, record: dict[str, Any]) -> None:
        assert self.engine is not None
        async with self.engine.begin() as connection:
            await connection.execute(audit_table.insert().values(**record))
