# Architecture

PriceWise follows one flow: product URL → retailer detection → authorized product identity → exact variant matching → verified offer ranking → store link.

## Boundaries

The Next.js application owns the input, status feedback, responsive comparison UI, and motion. It calls same-origin `/api/*` routes, which Next.js forwards to FastAPI on port 8000. Retailer authorization, matching decisions, price arithmetic, timestamps, and eligibility belong to the backend.

FastAPI validates URLs before resolving a recognized retailer. A typed connector boundary supplies normalized products and offers. The initial connector reads a local, operator-controlled authorized feed configured with `PRICEWISE_FEED_PATH`; it does not scrape arbitrary user-submitted addresses. See the feed schema in [the backend guide](../backend/README.md). An absent source produces explicit unavailable states.

Optional Redis provides shared cache and rate-limit state. Optional PostgreSQL records comparison activity. The core engine also runs without either service. The local Compose file supplies only these development services; it does not provision a deployment or connect retailer data.

## Accuracy contract

A connector supplies strong product identifiers, manufacturer/model details, variant attributes, provenance, verified timestamps, currency, price, shipping, availability, and separately identified conditional discounts. Feed ingestion must preserve source facts; operators must use data they are authorized to access.

Matching checks identifiers and attributes together. A shared title or high similarity score cannot override a conflicting storage capacity, color, generation, model, or pack size. Missing identity evidence must remain uncertain. Confidence describes identity evidence and does not turn an unverified price into a verified one.

Verification rejects invalid prices and excludes unavailable, stale, mismatched, or incomplete totals from cheapest-offer eligibility. Mandatory shipping contributes to a known total; unknown shipping cannot be treated as zero. Optional bank, coupon, and membership offers remain separate from the unconditional price. Comparisons use decimal amounts and a consistent currency.

Source timestamps remain authoritative through caching. Cached results do not become live prices simply because a request succeeds. The user sees the lowest verified total among the checked stores and an explanation for unavailable results, without internet-wide cheapest-price claims.

## Adding an authorized retailer

1. Obtain and document API/feed authorization and the retailer's access and rate-limit requirements.
2. Implement the connector against the normalized models. Validate upstream payloads, use bounded timeouts, and preserve provenance and timestamps.
3. Supply stable identifiers and exact variant information. Treat unknown or contradictory values as unverified.
4. Test matching conflicts, stale data, delivery costs, conditional offers, unavailable products, and upstream failure behavior.
5. Enable coverage only after actual source verification. Recognized domains and configured credentials alone are insufficient evidence of verified coverage.

Never place retailer credentials in frontend bundles or checked-in source files. The current feed path is an operator setting, not a user-provided URL. Future network connectors must retain HTTPS validation, host restrictions, redirect checks, and protection from private-network requests.

## Scope

The application includes a functioning UI and comparison engine. Live retailer integrations require authorized data access and source-specific operational validation. Authentication, carts, payments, sponsored rankings, and unrelated shopping modules are outside the workflow.
