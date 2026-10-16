# PriceWise comparison API

Python 3.12+, FastAPI, typed Decimal costs, and independent asynchronous retailer adapters. There are no built-in retailer prices, scraping calls, undocumented APIs, or invented provider endpoints. A normal installation has **no connected authorized retailer data**, so a valid product link returns an honest unavailable result.

## Run and test

From this directory:

```sh
UV_CACHE_DIR=/tmp/pricewise-uv-cache UV_LINK_MODE=copy uv sync --frozen
.venv/bin/uvicorn pricewise.main:app --host 127.0.0.1 --port 8000 --reload
.venv/bin/pytest -q
```

Optional real-service smoke test (requires Docker; pulls official Redis 7 and PostgreSQL 17 images, binds random loopback ports, and removes its disposable containers afterward):

```sh
.venv/bin/python scripts/check_services.py
```

The repository root `.env` is read automatically. Actual injected environment variables take precedence. No credentials belong in source control. The API documentation at `http://localhost:8000/docs` includes all request and response schemas.

| Endpoint | Behavior |
| --- | --- |
| `POST /api/compare` | JSON `{ "url": "https://www.amazon.in/dp/PRODUCT_ID" }`; the URL must contain a valid retailer product identifier. Returns checked stores, exact product when known, typed offers, coverage, and the eligible minimum total. |
| `GET /api/retailers` | Supported URL domains and which retailers have configured feed entries. Supported does not mean connected. |
| `GET /api/health` | Dependency modes and current feed validity. Unconfigured prices are explicitly reported. Invalid feeds and configured-service failures mark health degraded. |

Validation failures use HTTP 422, body size violations HTTP 413, and rate limits HTTP 429 with `Retry-After: 60`. No submitted URL is ever requested by the backend. Tracking parameters are removed; shortened URLs cannot be expanded.

## Connect authorized real data

Each retailer requires its own applicable data license, official API permission, partner credentials, or merchant-provided feed agreement. None was supplied with this project. Obtain authorization from Amazon India, Flipkart, Croma, Reliance Digital, and/or Vijay Sales before exporting their data. This code does not assert the existence of a publicly available API for any retailer.

A trusted operator runs an authorized importer separately and writes normalized JSON to an operator-controlled local file. Set `PRICEWISE_FEED_PATH` to that **absolute path**. The browser and API cannot select a path or upload a feed. Keep it outside the checkout or in the ignored `data/` directory. Use an atomic temporary-file rename for feed updates so readers never see a partial document. Feeds larger than 5 MiB or 10,000 entries are rejected. Import credentials never enter the normalized feed or API responses.

The feed envelope is:

```json
{
  "schema_version": 1,
  "authorization": {
    "authorized": true,
    "provider": "Your authorized provider or merchant name",
    "reference": "Your applicable agreement or license reference"
  },
  "offers": []
}
```

The authorization field is an operator attestation, **not proof of permission**. Set it only when you hold the required permission. An empty feed provides no prices. Add only verified real observations; never copy test fixtures into this file.

Each `offers` entry has these fields:

| Field | Type / requirements |
| --- | --- |
| `retailer` | `amazon`, `flipkart`, `croma`, `reliance`, or `vijay` |
| `url` | Direct HTTPS product page on that retailer's exact allowlisted domain. Must have a supported product identifier. |
| `product` | Product identity object described below. |
| `price` | Decimal INR string, greater than zero, at most two decimal places; `null` when unknown. |
| `shipping` | Nonnegative decimal INR string; explicit `"0.00"` means verified free delivery. `null` means unknown. |
| `mandatory_fees` | Nonnegative decimal INR string; explicit `"0.00"` means verified no mandatory fee. `null` means unknown. |
| `currency` | `INR` only; cross-currency ranking is intentionally unsupported. |
| `availability` | `in_stock`, `out_of_stock`, or `unknown` |
| `last_checked` | ISO 8601 observation timestamp with timezone, recorded by the authorized source. Never replace this with import time. |
| `conditional_discounts` | Array of `{ "label": string, "amount": decimal-string-or-null, "conditions": string }`; optional, never deducted from the ranked total. |

The `product` object has:

| Field | Type / requirements |
| --- | --- |
| `name`, `brand`, `model` | Nonempty normalized product title, manufacturer brand, and exact manufacturer model number. Retailer listing IDs are not manufacturer model numbers. |
| `category` | `smartphone`, `tablet`, `laptop`, `audio`, `appliance`, or `other` |
| `variant` | String map of every SKU distinction, using lowercase dimension keys. Common keys: `storage`, `color`, `generation`, `pack_size`, `ram`. Include connectivity, region, condition, edition, size, or any additional distinction relevant to the product. Use consistent units across source feeds. |
| `required_variant_fields` | Nonempty list of **all** dimensions that distinguish this product's variants. Omitted or unknown values fail verification. Importers must not omit distinctions to force a match. |
| `identifiers` | Optional map with `gtin`, `ean`, `upc`, `isbn13`, or `mpn`. Global identifiers require a valid GS1 checksum; invalid identifiers reject the whole feed. |
| `image_url` | Optional HTTPS image URL from the authorized source. |
| `specifications` | Optional string map of specifications, such as `Storage` and `Color`. Contradictions against declared variant values reject an identity match. |

Phones and tablets additionally require known storage, color, generation, and pack size, regardless of the declared list. Laptops also require RAM. Audio requires color, generation, and pack size. Appliances require color and pack size. Every known variant dimension must agree at both stores. Model, brand, category, conflicting GTINs/MPNs, recognized specifications, and explicit title contradictions for capacities, known colors, generations, and pack sizes are cross-checked. Natural-language checks remain conservative and cannot replace source importer validation. A title alone never verifies a product. Unknown values never produce a verified match.

The source product URL must exist in the authorized feed before cross-store matches can be established. The parser extracts retailer listing IDs from URLs; it does not infer brand, model, storage, color, or a price from a slug. One record is allowed per retailer listing ID. Multiple verified exact listings at one store are deduplicated to the lowest eligible total for that store.

## Cost, freshness, and confidence

- Eligible total is `price + shipping + mandatory_fees`, calculated with Decimal arithmetic. All three must be known, current, and in INR. Conditional offers remain separate.
- Only exact matches that are in stock and observed within `PRICEWISE_MAX_AGE_SECONDS` (default 900) can win. Future timestamps beyond a 60-second clock tolerance are invalid. Stale observations remain explicitly labeled and never win.
- Results are cached for at most `PRICEWISE_CACHE_TTL_SECONDS` (default 30). A feed content change invalidates the cache. Cache hits retain original observation timestamps, set `cached: true`, and recheck freshness before choosing the best offer. Feed observations are never labeled live.
- Match confidence is a deterministic **evidence score**, not a probability: 100 for matching global identifier plus complete model/variant agreement, 98 for matching MPN plus complete model/variant agreement, and 95 for complete manufacturer brand/model/variant agreement. A conflict or incomplete identity has score zero.
- The lowest result is limited to eligible offers from the checked retailers; there is no claim about the entire internet or unsupported stores. Missing and failed adapters remain explicit rows. `coverage.supported` counts supported URL parsers, `configured` counts stores with authorized feed entries, and `checked` counts stores whose configured data was actually consulted. With no source connected, zero stores are reported checked.

## Optional shared services

| Setting | Default |
| --- | --- |
| `PRICEWISE_FEED_PATH` | Unset: no source connected |
| `PRICEWISE_MAX_AGE_SECONDS` | `900` |
| `PRICEWISE_CACHE_TTL_SECONDS` | `30` |
| `PRICEWISE_RATE_LIMIT_PER_MINUTE` | `30` per direct client IP |
| `PRICEWISE_REDIS_URL` | Unset: bounded development memory cache/rate limiter |
| `PRICEWISE_DATABASE_URL` | Unset: bounded development memory audit; set a `postgresql+asyncpg://` DSN for PostgreSQL |
| `PRICEWISE_ENVIRONMENT` | `development`; `production` marks health degraded without shared Redis and PostgreSQL |
| `PRICEWISE_ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` |

The root Compose file can supply Redis and PostgreSQL. On startup, the API creates only the `pricewise_comparison_audit` table in the configured database. Audit records contain retailer, outcome, verified count, and timestamp; they do not contain submitted URLs, IPs, product details, or credentials. Redis supplies a shared fixed-window rate limiter and TTL result cache. If a configured service fails, health reports an explicit development fallback and the API continues independent comparisons.

Run behind a trusted HTTPS reverse proxy in production. Configure Uvicorn's trusted proxy settings for the real deployment; the application does not blindly accept client `X-Forwarded-For` headers. Use shared services across workers and monitor degraded health. Production readiness still requires authorized data agreements and importer validation, managed credentials, deployment-specific network controls, and running the optional-service integration checks in your deployment.

## Tests

The tests generate deliberately synthetic data **inside temporary test directories only**. They cover unsafe URLs, authorization/identifier validation, variant and metadata conflicts, full Decimal cost sorting, conditional-discount isolation, incomplete costs, stock, stale/future observations, cached freshness, feed cache invalidation, isolated connector failures, missing-source behavior, request size, and rate limiting. No test fixture is loaded by the application or presented as a live retailer observation.
