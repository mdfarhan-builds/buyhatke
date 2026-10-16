import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from decimal import Decimal

from .config import Settings
from .connectors import FeedSnapshot, RetailerConnector
from .matching import exact_match
from .models import Comparison, Coverage, FeedOffer, Offer, Product, Step
from .urls import RETAILERS, ProductURL, Retailer

logger = logging.getLogger(__name__)


def missing_offer(retailer: Retailer, reason: str, source_kind: str = "unconfigured", url: str | None = None) -> Offer:
    return Offer(id=f"{retailer.id}-unavailable", retailer=retailer.name, url=url, status="unavailable", reason=reason, source_kind=source_kind)


def verify_offer(entry: FeedOffer, product: Product, retailer: Retailer, now: datetime, max_age: int) -> Offer:
    match = exact_match(product, entry.product)
    age = (now - entry.last_checked).total_seconds()
    total = None
    if entry.price is not None and entry.shipping is not None and entry.mandatory_fees is not None:
        total = entry.price + entry.shipping + entry.mandatory_fees
    if not match.verified:
        status, reason = "mismatch", match.reason
    elif age < -60:
        status, reason = "unavailable", "The source timestamp is in the future; verification is required."
    elif age > max_age:
        status, reason = "stale", "This feed price is outdated and excluded from the lowest verified offer."
    elif entry.availability == "out_of_stock":
        status, reason = "out_of_stock", "The exact product is out of stock."
    elif entry.availability != "in_stock":
        status, reason = "incomplete", "Product availability could not be verified."
    elif total is None:
        status, reason = "incomplete", "The price, delivery charge, or mandatory fees are unknown; a verified total cannot be calculated."
    else:
        status, reason = "verified", match.reason
    return Offer(
        id=f"{retailer.id}-{hashlib.sha256(entry.url.encode()).hexdigest()[:12]}",
        retailer=retailer.name, url=entry.url, price=entry.price, shipping=entry.shipping,
        mandatory_fees=entry.mandatory_fees, total=total, status=status, reason=reason,
        last_checked=entry.last_checked, match_confidence=match.confidence,
        availability=entry.availability, conditional_discounts=entry.conditional_discounts,
        source_kind="authorized_feed",
    )


def rank(offers: list[Offer]) -> list[Offer]:
    return sorted(offers, key=lambda offer: (offer.status != "verified", offer.total if offer.status == "verified" and offer.total is not None else Decimal("Infinity"), offer.retailer))


def finalize(comparison: Comparison, now: datetime, max_age: int, cached: bool = False) -> Comparison:
    for offer in comparison.offers:
        offer.cached = cached and offer.source_kind == "authorized_feed"
        if offer.status == "verified" and offer.last_checked and (now - offer.last_checked).total_seconds() > max_age:
            offer.status = "stale"
            offer.reason = "This cached feed price is outdated and excluded from the lowest verified offer."
    comparison.offers = rank(comparison.offers)
    verified = [offer for offer in comparison.offers if offer.status == "verified"]
    comparison.best_offer_id = verified[0].id if verified else None
    comparison.coverage.verified = len(verified)
    comparison.status = "complete" if verified else "unavailable"
    if verified:
        comparison.message = f"Lowest verified total among {len(verified)} eligible offer{'s' if len(verified) != 1 else ''} from the retailers checked. Authorized feed observations; no conditional discounts included."
    elif comparison.product is not None:
        comparison.message = "No current, exact-match offer with verified availability and complete costs is available."
    return comparison


async def compare(url: ProductURL, snapshot: FeedSnapshot, settings: Settings, now: datetime | None = None) -> Comparison:
    now = now or datetime.now(timezone.utc)
    connectors = [RetailerConnector(retailer, snapshot) for retailer in RETAILERS]
    configured = sum(connector.configured for connector in connectors)
    source_connector = next(connector for connector in connectors if connector.retailer.id == url.retailer.id)
    source = await source_connector.resolve(url)
    if source is None:
        reason = snapshot.reason or "Price currently unavailable — verification required. This product link is not present in the authorized feed; its exact identity cannot be verified."
        return Comparison(
            status="unavailable", source_retailer=url.retailer.name, product=None,
            offers=[missing_offer(retailer, reason, "authorized_feed" if snapshot.feed else "unconfigured", url.canonical_url if retailer.id == url.retailer.id else None) for retailer in RETAILERS],
            best_offer_id=None, coverage=Coverage(checked=int(source_connector.configured), supported=len(RETAILERS), verified=0, retailers=[url.retailer.name] if source_connector.configured else [], configured=configured),
            steps=[Step(id="url", label="Product URL validated", status="complete"), Step(id="identity", label="Exact product identity unavailable", status="unavailable"), Step(id="prices", label="Authorized retailer prices unavailable", status="unavailable")],
            message="No verified match is available. Connect an authorized source containing this exact product to compare real prices.",
            data_mode="authorized_feed" if snapshot.feed else "unconfigured", generated_at=now,
        )

    async def lookup(connector: RetailerConnector) -> Offer:
        entries = await connector.candidates(source.product)
        if not entries:
            return missing_offer(connector.retailer, "Price currently unavailable — verification required. No matching authorized listing is available for this store.", "authorized_feed" if connector.configured else "unconfigured")
        offers = [verify_offer(entry, source.product, connector.retailer, now, settings.max_age_seconds) for entry in entries]
        # One row per store. Never pick a cheaper mismatched SKU over an exact candidate.
        offers.sort(key=lambda offer: (offer.status != "verified", offer.match_confidence == 0, offer.total if offer.status == "verified" and offer.total is not None else Decimal("Infinity")))
        return offers[0]

    results = await asyncio.gather(*(lookup(connector) for connector in connectors), return_exceptions=True)
    offers = []
    for connector, result in zip(connectors, results, strict=True):
        if isinstance(result, BaseException):
            logger.warning("Retailer connector failed: %s", connector.retailer.id)
            offers.append(missing_offer(connector.retailer, "Price currently unavailable — verification required. The authorized retailer connector failed.", "authorized_feed" if connector.configured else "unconfigured"))
        else:
            offers.append(result)
    comparison = Comparison(
        status="unavailable", source_retailer=url.retailer.name, product=source.product,
        offers=offers, best_offer_id=None,
        coverage=Coverage(checked=configured, supported=len(RETAILERS), verified=0, retailers=[connector.retailer.name for connector in connectors if connector.configured], configured=configured),
        steps=[Step(id="url", label="Product URL validated", status="complete"), Step(id="identity", label="Product details resolved from authorized feed", status="complete"), Step(id="prices", label="Retailer identity, availability, freshness, and costs checked", status="complete")],
        message="", data_mode="authorized_feed", generated_at=now,
    )
    return finalize(comparison, now, settings.max_age_seconds)
