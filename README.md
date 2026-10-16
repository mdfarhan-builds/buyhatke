# PriceWise

A focused product comparison application: paste a supported retailer link, verify the exact product variant, compare verified total prices, then visit a store. The interface uses a dark design, scroll reveals, a reading progress indicator, and pointer interactions with reduced-motion support.

**Current data coverage:** no live retailer API or authorized product feed is connected by default. Amazon, Flipkart, Croma, Reliance Digital, and Vijay Sales links can be recognized; recognition does not mean verified price coverage. Without an authorized feed the application returns “Price currently unavailable — verification required.” It does not invent prices or label sample offers as live.

To see the UI on a phone or computer through a public URL, follow [the Render + Vercel deployment guide](docs/deployment.md). `render.yaml` configures a free API preview, and `vercel.json` configures the Next.js frontend. Hosting deployment must be completed in your accounts; a cloud-environment snapshot or screenshot is not a public website.

You can deploy the interface on Vercel first without an API URL. It displays the homepage and explicitly reports that comparisons are unavailable. To enable comparisons, deploy the Render API, set `PRICEWISE_API_URL` in Vercel, and redeploy.

`npm run build:static-preview` exports a portable interface preview to the ignored `.artifacts/static-site` directory. It builds in a temporary directory, preserves the normal application build, and makes no API requests. Its comparison form explicitly reports that a connected backend is required. This export is only for viewing the UI; it does not run FastAPI or compare prices.

## Run locally

Install Node.js 24+, [uv](https://docs.astral.sh/uv/), and Python 3.12. From the repository root:

```sh
npm ci
uv sync --project backend --frozen
npm run dev
```

Open <http://localhost:3000>. The development command starts Next.js on port 3000 and FastAPI on port 8000. Next.js forwards `/api/*` to FastAPI so the browser uses one origin. Python can be installed with `uv python install 3.12` if needed.

In a restricted cloud workspace with a read-only home directory, set a writable uv cache before installation or Python test commands:

```sh
export UV_CACHE_DIR=/workspace/.cache/uv
export UV_LINK_MODE=copy
```

The default workflow needs no secrets or database. The UI, URL validation, retailer detection, matching engine, and unavailable-price states work without a feed. Actual product extraction and comparisons require an authorized normalized feed; see [backend/README.md](backend/README.md). Prices cannot be verified by pasting a link alone when the source is not connected.

```sh
cp .env.example .env
```

Use `.env` for local settings. Do not commit feed data, passwords, or API keys. The API reads the repository root `.env` automatically, including when launched from `backend`. Injected environment variables take precedence.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and API together |
| `npm run dev:web` | Run Next.js on port 3000 |
| `npm run dev:api` | Run FastAPI on port 8000 |
| `npm run build` | Build the production frontend |
| `npm run start` | Serve an already-built production frontend |
| `npm run typecheck` | Check frontend TypeScript |
| `npm run test:api` | Run backend tests |
| `npm run test:e2e` | Run Chromium browser tests; starts the development app if needed |

Backend commands can also be run directly:

```sh
cd backend
uv run uvicorn pricewise.main:app --host 127.0.0.1 --port 8000
uv run pytest
```

API documentation is available at <http://localhost:8000/docs>. Health is exposed at `/api/health`, retailer coverage at `/api/retailers`, and comparisons at `POST /api/compare` with a JSON body such as `{"url":"https://www.amazon.in/dp/B0CHX1W1XY"}`. That example tests URL handling and unavailable-source behavior; it is not a promise of price coverage.

Browser tests use the cloud environment's Chromium at `/usr/bin/chromium`. On another machine, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your installed Chromium executable. Run the suite with the default unconfigured feed. It exercises real API validation and unavailable-source responses, keyboard interactions, responsive layouts from 320 to 1440 px, normal-motion scroll storytelling, and a clearly isolated browser-only synthetic response for verified-result rendering. Synthetic data is never written to the application feed. Reports and failure artifacts are written under ignored `.artifacts/`.

## Optional PostgreSQL and Redis

For persistent comparison records and shared caching/rate limiting, install Docker with Compose, copy `.env.example` to `.env`, and replace `POSTGRES_PASSWORD` with a local development password. Then:

```sh
docker compose up -d
```

Uncomment `PRICEWISE_DATABASE_URL` and `PRICEWISE_REDIS_URL` in `.env`, update the database password in the URL, and restart the API. These development services bind to loopback and preserve data in Docker volumes. `docker compose down` stops them without deleting the volumes.

## How verified results work

- Only explicitly supported HTTPS retailer hosts and product-link patterns are accepted. The API does not fetch arbitrary submitted URLs.
- Product identity uses strong identifiers and exact variant checks. Conflicting models, colors, storage, generations, or pack sizes cannot be ranked together.
- Freshness, availability, and mandatory shipping affect eligibility. Unknown delivery costs and conditional discounts do not become a fabricated total.
- Results rank eligible offers by known total price and describe the lowest verified offer among the retailers checked. Cached and stale information retains its timestamps and status.
- Retailer integrations must use authorized APIs, permitted feeds, or other sources the operator is entitled to access. CAPTCHA, authentication, and access restrictions are not bypassed.

The initial integration is an operator-controlled local normalized feed. Connectors still need retailer authorization, source-specific extraction, and operational validation before live coverage can be advertised. This is a working application foundation, not a claim of production retailer coverage.

## Structure

```text
app/                 Next.js pages, layout, and shared styles
components/          Interactive comparison and homepage UI
backend/             FastAPI, connectors, matching, verification, tests
tests/               Browser interaction and integration checks
docs/architecture.md Data flow and integration boundaries
compose.yaml         Optional local PostgreSQL and Redis
.env.example         Safe configuration template
```

See [the architecture notes](docs/architecture.md) and [the backend guide](backend/README.md) for integration details. Cloud tasks already use isolated checkouts; use the existing repository without creating an additional Git worktree unless explicitly requested.
