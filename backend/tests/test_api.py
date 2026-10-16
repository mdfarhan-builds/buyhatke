import json

from fastapi.testclient import TestClient

from pricewise.config import Settings
from pricewise.main import create_app

from conftest import URLS, make_offer


def test_unconfigured_api_honestly_reports_unavailable(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/compare", json={"url": URLS["amazon"]})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "unavailable"
        assert body["product"] is None
        assert body["best_offer_id"] is None
        assert body["coverage"]["checked"] == 0
        assert body["coverage"]["supported"] == 5
        assert len(body["offers"]) == 5
        assert all(offer["price"] is None and offer["total"] is None for offer in body["offers"])
        assert client.get("/api/health").json()["dependencies"]["cache"] == "development_memory"
        assert all(not row["configured"] for row in client.get("/api/retailers").json()["retailers"])


def test_unsafe_url_returns_clear_validation_error(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/compare", json={"url": "https://127.0.0.1/"})
        assert response.status_code == 422
        assert isinstance(response.json()["detail"], str)


def test_authorized_feed_api_decimal_output_caching_and_invalidation(settings, write_feed):
    path = write_feed([make_offer(), make_offer("flipkart", price="90.05", shipping="0.10", mandatory_fees="0.15")])
    settings.feed_path = path
    with TestClient(create_app(settings)) as client:
        first = client.post("/api/compare", json={"url": URLS["amazon"]}).json()
        assert first["offers"][0]["total"] == "90.30"
        assert first["offers"][0]["cached"] is False
        second = client.post("/api/compare", json={"url": URLS["amazon"]}).json()
        assert second["offers"][0]["cached"] is True
        content = json.loads(path.read_text())
        content["offers"][1]["price"] = "120.00"
        path.write_text(json.dumps(content))
        third = client.post("/api/compare", json={"url": URLS["amazon"]}).json()
        assert third["offers"][0]["retailer"] == "Amazon"
        assert third["offers"][0]["cached"] is False


def test_rate_limit_is_enforced(settings):
    settings.rate_limit_per_minute = 1
    with TestClient(create_app(settings)) as client:
        assert client.post("/api/compare", json={"url": URLS["amazon"]}).status_code == 200
        response = client.post("/api/compare", json={"url": URLS["amazon"]})
        assert response.status_code == 429
        assert response.headers["Retry-After"] == "60"


def test_large_request_rejected_before_json_parse(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/compare", content="x" * 17000, headers={"Content-Type": "application/json"})
        assert response.status_code == 413


def test_invalid_feed_returns_unavailable_without_exposing_input(tmp_path, settings):
    settings.feed_path = tmp_path / "invalid.json"
    settings.feed_path.write_text('{"secret_value":"do-not-log"}')
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/compare", json={"url": URLS["amazon"]})
        assert response.status_code == 200
        assert "do-not-log" not in response.text
        assert response.json()["status"] == "unavailable"
        assert client.get("/api/health").json()["status"] == "degraded"


def test_production_without_shared_services_marks_health_degraded(settings):
    settings.environment = "production"
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").json()["status"] == "degraded"
