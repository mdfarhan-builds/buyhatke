"""Authorized feed adapters. No retailer scraping or undocumented APIs are used."""

import asyncio
import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path

from pydantic import ValidationError

from .models import AuthorizedFeed, FeedOffer, Product, normalized
from .urls import ProductURL, Retailer, validate_product_url

logger = logging.getLogger(__name__)
MAX_FEED_BYTES = 5 * 1024 * 1024


@dataclass(frozen=True)
class FeedSnapshot:
    feed: AuthorizedFeed | None
    fingerprint: str
    state: str
    reason: str


class AuthorizedFeedRepository:
    def __init__(self, path: Path | None):
        self.path = path
        self.state = "unconfigured" if path is None else "not_checked"

    async def load(self) -> FeedSnapshot:
        if self.path is None:
            return FeedSnapshot(None, "unconfigured", "unconfigured", "Price currently unavailable — verification required. No authorized data source is connected.")
        try:
            raw = await asyncio.to_thread(self._read)
            feed = await asyncio.to_thread(AuthorizedFeed.model_validate_json, raw)
            self.state = "ready"
            return FeedSnapshot(feed, hashlib.sha256(raw).hexdigest(), "ready", "")
        except (OSError, ValueError, ValidationError):
            # Deliberately avoid logging file contents, paths, credentials, or validation input.
            logger.warning("Authorized feed unavailable or invalid; no prices accepted")
            self.state = "invalid"
            return FeedSnapshot(None, "invalid", "invalid", "Price currently unavailable — verification required. The configured authorized feed could not be validated.")

    def _read(self) -> bytes:
        assert self.path is not None
        if self.path.stat().st_size > MAX_FEED_BYTES:
            raise ValueError("Feed exceeds size limit")
        with self.path.open("rb") as handle:
            raw = handle.read(MAX_FEED_BYTES + 1)
        if len(raw) > MAX_FEED_BYTES:
            raise ValueError("Feed exceeds size limit")
        return raw


class RetailerConnector:
    """One adapter per retailer; replace only with documented, authorized integrations."""

    def __init__(self, retailer: Retailer, snapshot: FeedSnapshot):
        self.retailer = retailer
        self.snapshot = snapshot
        self.entries = [offer for offer in snapshot.feed.offers if offer.retailer == retailer.id] if snapshot.feed else []

    @property
    def configured(self) -> bool:
        return bool(self.entries)

    async def resolve(self, url: ProductURL) -> FeedOffer | None:
        return next((entry for entry in self.entries if validate_product_url(entry.url).key == url.key), None)

    async def candidates(self, product: Product) -> list[FeedOffer]:
        # A broad brand/model candidate set is always followed by exact identity validation.
        # Retain same-brand products with differing models to explain variant/model mismatches.
        return [entry for entry in self.entries if normalized(entry.product.brand) == normalized(product.brand)]
