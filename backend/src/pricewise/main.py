import hashlib
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.types import ASGIApp, Receive, Scope, Send

from .config import Settings
from .connectors import AuthorizedFeedRepository
from .engine import compare, finalize
from .infrastructure import Infrastructure
from .models import Comparison, CompareRequest
from .urls import RETAILERS, validate_product_url

logger = logging.getLogger(__name__)


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int = 16384):
        self.app, self.max_bytes = app, max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > self.max_bytes:
                await JSONResponse({"detail": "Request body exceeds the 16 KB limit."}, status_code=413)(scope, receive, send)
                return
            if not message.get("more_body", False):
                break
        consumed = False

        async def limited_receive() -> dict:
            nonlocal consumed
            if not consumed:
                consumed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, limited_receive, send)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    infrastructure = Infrastructure(settings)
    repository = AuthorizedFeedRepository(settings.feed_path)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await infrastructure.start()
        yield
        await infrastructure.close()

    app = FastAPI(title="PriceWise comparison API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.infrastructure = infrastructure
    app.state.repository = repository
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/api/health")
    async def health():
        return {
            "status": "ok",
            "data_mode": "live_comparison",
            "dependencies": {"feed": "ready", "cache": infrastructure.cache_mode, "rate_limit": infrastructure.cache_mode, "audit": infrastructure.audit_mode},
            "message": "Live product comparison and price tracking engine is active.",
        }

    @app.get("/api/retailers")
    async def retailers():
        return {
            "retailers": [{"id": retailer.id, "name": retailer.name, "domains": list(retailer.domains), "configured": True} for retailer in RETAILERS],
            "data_mode": "live_comparison",
        }

    @app.post("/api/compare", response_model=Comparison)
    async def compare_product(payload: CompareRequest, request: Request):
        client = request.client.host if request.client else "unknown"
        client_key = hashlib.sha256(client.encode()).hexdigest()
        if not await infrastructure.allowed(client_key):
            raise HTTPException(status_code=429, detail="Too many comparisons. Please try again in one minute.", headers={"Retry-After": "60"})
        try:
            url = validate_product_url(payload.url)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        snapshot = await repository.load()
        cache_key = hashlib.sha256(f"{url.key}:{snapshot.fingerprint}:{settings.max_age_seconds}".encode()).hexdigest()
        stored = await infrastructure.cache_get(cache_key)
        comparison = None
        if stored:
            try:
                comparison = finalize(Comparison.model_validate_json(stored), datetime.now(timezone.utc), settings.max_age_seconds, cached=True)
            except (ValueError, ValidationError):
                logger.warning("Invalid cached comparison ignored")
        if comparison is None:
            comparison = await compare(url, snapshot, settings)
            await infrastructure.cache_set(cache_key, comparison.model_dump_json())
        await infrastructure.audit(url.retailer.id, comparison.status, comparison.coverage.verified)
        return comparison

    return app


app = create_app()
