import pytest
from pydantic import ValidationError

from pricewise.models import AuthorizedFeed, FeedOffer, Product, valid_gtin
from pricewise.urls import validate_product_url

from conftest import PRODUCT, URLS, make_offer


@pytest.mark.parametrize("url", [
    "http://www.amazon.in/dp/B0TEST0001", "https://127.0.0.1/dp/B0TEST0001",
    "https://169.254.169.254/latest/meta-data/", "https://www.amazon.in.evil.test/dp/B0TEST0001",
    "https://www.amazon.in@evil.test/dp/B0TEST0001", "https://user:secret@www.amazon.in/dp/B0TEST0001",
    "https://www.amazon.in:9999/dp/B0TEST0001", "https://www.amazon.in\\@evil.test/dp/B0TEST0001",
    "https://www.amazon.in/dp/B0TEST0001\nanything", "file:///etc/passwd",
    "https://www.amazon.in/dp%2fB0TEST0001", "https://amzn.in/a/shortlink",
    "https://www.amazon.in/", "https://www.flipkart.com/search?q=phone",
    "https://www.flipkart.com/search?q=phone&pid=MOBTEST123456", "https://www.flipkart.com/?pid=MOBTEST123456",
    "https://www.croma.com/anything/without-an-id", "https://[::1]/dp/B0TEST0001",
    "https://www.amazon.in./dp/B0TEST0001", "https://www.amazon.in/%00/dp/B0TEST0001",
])
def test_unsafe_unsupported_and_non_product_urls_rejected(url):
    with pytest.raises(ValueError):
        validate_product_url(url)


@pytest.mark.parametrize("retailer,url", URLS.items())
def test_supported_direct_product_urls(retailer, url):
    assert validate_product_url(url).retailer.id == retailer


def test_tracking_parameters_and_fragments_removed():
    parsed = validate_product_url(URLS["amazon"] + "?tag=tracking&redirect=http://localhost#ignored")
    assert parsed.canonical_url == URLS["amazon"]
    assert parsed.key == "amazon:B0TEST0001"


def test_gtin_checksum_is_checked():
    assert valid_gtin("4006381333931")
    assert valid_gtin("036000291452")
    assert not valid_gtin("4006381333932")
    assert not valid_gtin("0000000000000")
    product = {**PRODUCT, "identifiers": {"ean": "4006381333932"}}
    with pytest.raises(ValidationError):
        Product.model_validate(product)


def test_feed_rejects_wrong_retailer_timezone_and_precision():
    for overrides in ({"url": URLS["flipkart"]}, {"last_checked": "2026-10-15T00:00:00"}, {"price": "100.001"}):
        with pytest.raises(ValidationError):
            FeedOffer.model_validate(make_offer(**overrides))


def test_feed_requires_authorization_attestation_and_unique_ids():
    data = {"schema_version": 1, "authorization": {"authorized": False, "provider": "Test", "reference": "Test only"}, "offers": [make_offer()]}
    with pytest.raises(ValidationError):
        AuthorizedFeed.model_validate(data)
    data["authorization"]["authorized"] = True
    data["offers"].append(make_offer())
    with pytest.raises(ValidationError):
        AuthorizedFeed.model_validate(data)
