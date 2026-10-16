# Open a public Pricewise preview

This repository contains the deployment configuration. Import it into your own Render and Vercel accounts; no hosting credentials belong in the repository or chat. Publishing a Codex environment does not publish this website.

## 1. Deploy the API on Render

1. Sign in at https://dashboard.render.com/ and choose **New → Blueprint**.
2. Connect GitHub and select `mfprince3524/buyhatke`, branch `main`.
3. Use the repository's `render.yaml` and create the Blueprint. It declares one **Free** Python web service, `pricewise-api`, and no paid databases.
4. Wait until deployment succeeds. Open the service and copy its actual public HTTPS URL.
5. Append `/api/health` to that URL and open it. The response should have `status: "ok"`, `data_mode: "unconfigured"`, and a message explaining that no authorized retailer feed is connected.

Render reads the `backend` directory, uses Python 3.12.14, installs the frozen uv lockfile without test dependencies, and binds Uvicorn to its assigned `PORT`. The explicit `preview` mode uses bounded in-memory cache/rate limiting and audit storage. It is a functional preview rather than a production deployment with shared services. Free services can take time to wake up after being idle.

If the Blueprint UI is unavailable, create a **Web Service** from the same repository with these settings:

| Setting | Value |
| --- | --- |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `uv sync --frozen --no-dev` |
| Start Command | `.venv/bin/uvicorn pricewise.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Instance Type | Free |
| Environment variable | `PYTHON_VERSION=3.12.14` |
| Environment variable | `PRICEWISE_ENVIRONMENT=preview` |

## 2. Deploy the interface on Vercel

1. Sign in at https://vercel.com/new and import `mfprince3524/buyhatke`.
2. Select the `main` branch, framework **Next.js**, repository root **`.`**, and Node.js **24.x**. Leave the output directory at the framework default. `vercel.json` supplies the install/build commands.
3. Before pressing Deploy, add **`PRICEWISE_API_URL`**. Paste the actual Render service HTTPS URL copied in step 1. Use the origin only: no `/api`, credentials, query, or fragment. Do not enter a placeholder URL. Enable the variable for the Production and Preview environments you intend to use.
4. Click **Deploy**, wait for success, and open the actual `.vercel.app` URL Vercel gives you. This is the website you can open on a phone or computer.

`PRICEWISE_API_URL` is a non-secret server-side setting; it does not need a `NEXT_PUBLIC_` prefix. It is compiled into the API rewrite during the Next.js build. Updating it requires redeploying Vercel. Requests use the Vercel website's `/api/*` path, so browsers do not need direct cross-origin access to Render. Next.js intentionally fails a Vercel build if this required setting is missing or malformed.

## 3. Verify the public preview

- Open the Vercel website and check navigation and scrolling on desktop/mobile.
- Open `/api/health` on the **Vercel URL** as well. The response should come from the Render API through the frontend proxy.
- Submit a supported direct product link. With no authorized feed configured, expect five honest unavailable retailer rows, no invented prices, and no cheapest-offer claim.
- Unsupported sites, non-product links, and unsafe URLs must show useful validation feedback.

If the interface loads but comparisons fail, first verify Render health, then confirm the exact `PRICEWISE_API_URL` in Vercel and redeploy. If Render is waking up, wait until its health URL responds and try again. A timeout must not be replaced with fictional prices.

No retailer feed, paid database, or secret is needed to see the interface. Real product prices still need authorized feeds as described in [the backend guide](../backend/README.md). Production use additionally needs shared Redis/PostgreSQL, correctly trusted deployment proxies, monitoring, and importer validation. Do not expose local feeds, `.env`, credentials, screenshots, or test fixtures in a deployment.
