"""Entirely synthetic test fixtures. Never loaded by the application."""

import copy
import json
from datetime import datetime, timezone

import pytest

from pricewise.config import Settings

URLS = {
    "amazon": "https://www.amazon.in/dp/B0TEST0001",
    "flipkart": "https://www.flipkart.com/fixture/p/itm123456789?pid=MOBTEST123456",
    "croma": "https://www.croma.com/fixture/p/310001",
    "reliance": "https://www.reliancedigital.in/fixture/p/492345678",
    "vijay": "https://www.vijaysales.com/product/fixture-device-test-only",
}

PRODUCT = {
    "name": "SYNTHETIC TEST ONLY Fixture Device 16 Black 128 GB",
    "brand": "TestBrand",
    "model": "FIXTURE-16",
    "category": "smartphone",
    "variant": {"storage": "128 GB", "color": "Black", "generation": "16", "pack_size": "1"},
    "required_variant_fields": ["storage", "color", "generation", "pack_size"],
    "identifiers": {"ean": "4006381333931", "mpn": "FIXTURE-16-128-BLK"},
    "specifications": {"Storage": "128 GB", "Color": "Black"},
}


def make_offer(retailer="amazon", **overrides):
    value = {
        "retailer": retailer, "url": URLS[retailer], "product": copy.deepcopy(PRODUCT),
        "price": "100.10", "shipping": "0.00", "mandatory_fees": "0.00", "currency": "INR",
        "availability": "in_stock", "last_checked": datetime.now(timezone.utc).isoformat(),
        "conditional_discounts": [],
    }
    value.update(overrides)
    return value


@pytest.fixture
def settings():
    return Settings(_env_file=None, feed_path=None, redis_url=None, database_url=None)


@pytest.fixture
def write_feed(tmp_path):
    def write(offers):
        path = tmp_path / "synthetic-test-only.json"
        path.write_text(json.dumps({"schema_version": 1, "authorization": {"authorized": True, "provider": "SYNTHETIC TEST FIXTURES", "reference": "Not a real retailer source; tests only"}, "offers": offers}))
        return path
    return write
