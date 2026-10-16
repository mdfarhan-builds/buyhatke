import copy
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from pricewise.connectors import AuthorizedFeedRepository, RetailerConnector
from pricewise.engine import compare, finalize
from pricewise.matching import exact_match
from pricewise.models import Product
from pricewise.urls import validate_product_url

from conftest import PRODUCT, URLS, make_offer


@pytest.mark.parametrize("dimension,value", [("storage", "256 GB"), ("color", "White"), ("generation", "15"), ("pack_size", "2")])
def test_same_gtin_never_overrides_variant_conflicts(dimension, value):
    candidate = copy.deepcopy(PRODUCT)
    candidate["variant"][dimension] = value
    assert not exact_match(Product.model_validate(PRODUCT), Product.model_validate(candidate)).verified


@pytest.mark.parametrize("dimension", ["storage", "color", "generation", "pack_size"])
def test_unknown_variant_is_never_verified(dimension):
    candidate = copy.deepcopy(PRODUCT)
    candidate["variant"].pop(dimension)
    assert not exact_match(Product.model_validate(PRODUCT), Product.model_validate(candidate)).verified


def test_variant_declaration_cannot_omit_category_requirements():
    source = copy.deepcopy(PRODUCT)
    source["required_variant_fields"] = ["pack_size"]
    source["variant"] = {"pack_size": "1"}
    assert not exact_match(Product.model_validate(source), Product.model_validate(source)).verified


def test_conflicting_global_identifiers_are_rejected():
    other = copy.deepcopy(PRODUCT)
    other["identifiers"]["ean"] = "9780306406157"
    assert not exact_match(Product.model_validate(PRODUCT), Product.model_validate(other)).verified


def test_complete_manufacturer_identity_can_match_without_gtin():
    product = {**PRODUCT, "identifiers": {}}
    match = exact_match(Product.model_validate(product), Product.model_validate(product))
    assert match.verified and match.confidence == 95


@pytest.mark.parametrize("field,value", [("name", "Fixture Device 16 Black 256 GB"), ("name", "Fixture Device 16 White 128 GB"), ("name", "Fixture Device 15 Black 128 GB"), ("name", "Fixture Device 16 Black 256 GB 8GB RAM"), ("name", "Fixture Device 16 Black 128 GB Pack of 2"), ("specifications", {"Storage": "256 GB", "Color": "Black"})])
def test_title_and_specification_conflicts_cannot_be_verified(field, value):
    candidate = {**copy.deepcopy(PRODUCT), field: value}
    match = exact_match(Product.model_validate(PRODUCT), Product.model_validate(candidate))
    assert not match.verified
    assert "conflict" in match.reason


def test_identical_titles_do_not_override_a_model_conflict():
    candidate = {**copy.deepcopy(PRODUCT), "model": "A-DIFFERENT-MODEL"}
    assert not exact_match(Product.model_validate(PRODUCT), Product.model_validate(candidate)).verified


def test_multiple_title_capacities_are_allowed_when_each_is_verified():
    product = copy.deepcopy(PRODUCT)
    product["name"] = "Fixture Device 16 Black 128GB Storage 8GB RAM"
    product["variant"]["ram"] = "8 GB"
    assert exact_match(Product.model_validate(product), Product.model_validate(product)).verified


async def test_exact_matching_full_cost_freshness_stock_and_conditional_discounts(write_feed, settings):
    now = datetime.now(timezone.utc)
    wrong_variant = copy.deepcopy(PRODUCT)
    wrong_variant["variant"]["color"] = "White"
    entries = [
        make_offer("amazon", price="100.10", shipping="20.20", mandatory_fees="2.30"),
        make_offer("flipkart", price="110.00", conditional_discounts=[{"label": "Test bank card", "amount": "50.00", "conditions": "Only a qualifying test card; never deducted from total"}]),
        make_offer("croma", price="70.00", last_checked=(now - timedelta(hours=1)).isoformat()),
        make_offer("reliance", price="60.00", product=wrong_variant),
        make_offer("vijay", price="50.00", availability="out_of_stock"),
    ]
    snapshot = await AuthorizedFeedRepository(write_feed(entries)).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings, now)
    by_store = {offer.retailer: offer for offer in result.offers}
    assert result.status == "complete"
    assert by_store["Amazon"].total == Decimal("122.60")
    assert by_store["Flipkart"].total == Decimal("110.00")
    assert result.best_offer_id == by_store["Flipkart"].id
    assert result.coverage.verified == 2
    assert by_store["Croma"].status == "stale"
    assert by_store["Reliance Digital"].status == "mismatch"
    assert by_store["Vijay Sales"].status == "out_of_stock"
    assert result.offers[0].retailer == "Flipkart"


@pytest.mark.parametrize("overrides", [{"shipping": None}, {"mandatory_fees": None}, {"price": None}, {"availability": "unknown"}])
async def test_unknown_required_cost_or_stock_prevents_cheapest(write_feed, settings, overrides):
    snapshot = await AuthorizedFeedRepository(write_feed([make_offer(**overrides)])).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings)
    assert result.best_offer_id is None
    assert result.coverage.verified == 0
    amazon = next(offer for offer in result.offers if offer.retailer == "Amazon")
    assert amazon.status == "incomplete"


async def test_future_observation_not_current(write_feed, settings):
    entry = make_offer(last_checked=(datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat())
    snapshot = await AuthorizedFeedRepository(write_feed([entry])).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings)
    assert not result.best_offer_id
    assert next(offer for offer in result.offers if offer.retailer == "Amazon").status == "unavailable"


async def test_cache_freshness_rechecked_when_response_reused(write_feed, settings):
    now = datetime.now(timezone.utc)
    snapshot = await AuthorizedFeedRepository(write_feed([make_offer(last_checked=now.isoformat())])).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings, now)
    assert result.best_offer_id
    result = finalize(result, now + timedelta(seconds=settings.max_age_seconds + 1), settings.max_age_seconds, cached=True)
    assert result.best_offer_id is None
    assert result.status == "unavailable"
    assert next(offer for offer in result.offers if offer.retailer == "Amazon").cached


async def test_connector_failure_does_not_hide_other_retailers(monkeypatch, write_feed, settings):
    snapshot = await AuthorizedFeedRepository(write_feed([make_offer(), make_offer("flipkart")])).load()
    original = RetailerConnector.candidates

    async def flaky(self, product):
        if self.retailer.id == "flipkart":
            raise TimeoutError("Synthetic connector failure")
        return await original(self, product)

    monkeypatch.setattr(RetailerConnector, "candidates", flaky)
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings)
    assert result.coverage.verified == 1
    assert next(offer for offer in result.offers if offer.retailer == "Flipkart").status == "unavailable"


async def test_missing_original_product_cannot_compare_based_on_slug(write_feed, settings):
    snapshot = await AuthorizedFeedRepository(write_feed([make_offer("flipkart")])).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings)
    assert result.product is None
    assert result.best_offer_id is None
    assert all(offer.price is None for offer in result.offers)
