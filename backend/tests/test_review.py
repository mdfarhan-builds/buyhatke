"""Independent regressions for the comparison engine's trust boundaries."""

import copy
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from pricewise.connectors import AuthorizedFeedRepository
from pricewise.engine import compare
from pricewise.main import create_app
from pricewise.urls import validate_product_url

from conftest import PRODUCT, URLS, make_offer


async def test_store_deduplication_chooses_lowest_exact_total(write_feed, settings):
    wrong_variant = copy.deepcopy(PRODUCT)
    wrong_variant["variant"]["color"] = "White"
    entries = [
        make_offer(price="100.00"),
        make_offer(url="https://www.amazon.in/dp/B0TEST0002", price="80.00", shipping="1.00"),
        make_offer(url="https://www.amazon.in/dp/B0TEST0003", price="1.00", product=wrong_variant),
    ]
    snapshot = await AuthorizedFeedRepository(write_feed(entries)).load()
    result = await compare(validate_product_url(URLS["amazon"]), snapshot, settings)
    eligible = [offer for offer in result.offers if offer.status == "verified"]
    assert len(eligible) == 1
    assert eligible[0].url == "https://www.amazon.in/dp/B0TEST0002"
    assert eligible[0].total == Decimal("81.00")
    assert result.best_offer_id == eligible[0].id


@pytest.mark.parametrize("field,value", [("price", "NaN"), ("shipping", "Infinity"), ("mandatory_fees", "-Infinity")])
async def test_nonfinite_feed_money_rejects_entire_snapshot(write_feed, field, value):
    path = write_feed([make_offer(), make_offer("flipkart", **{field: value})])
    snapshot = await AuthorizedFeedRepository(path).load()
    assert snapshot.state == "invalid"
    assert snapshot.feed is None


@pytest.mark.parametrize("body", ["{", "[]", '{"url":null}', '{"url":42}'])
def test_malformed_request_has_validation_response_without_server_error(settings, body):
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/compare", content=body, headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "detail" in response.json()


async def test_duplicate_urls_cannot_hide_behind_tracking_parameters(write_feed):
    path = write_feed([
        make_offer(),
        make_offer(url=URLS["amazon"] + "?tag=separate-listing&ref=tracking", price="1.00"),
    ])
    snapshot = await AuthorizedFeedRepository(path).load()
    assert snapshot.state == "invalid"
    assert snapshot.feed is None
