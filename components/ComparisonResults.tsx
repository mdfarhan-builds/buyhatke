"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Fingerprint,
  Info,
  LoaderCircle,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { Comparison, Offer } from "@/lib/types";
import PriceHistoryChart from "./PriceHistoryChart";

const money = (value: string | number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(value));

const statusLabel: Record<string, string> = {
  verified: "Verified deal",
  unavailable: "Unavailable",
  stale: "Outdated price",
  mismatch: "Different variant",
  out_of_stock: "Out of stock",
  incomplete: "Verification incomplete",
};

const retailerStyles: Record<
  string,
  { bg: string; color: string; border: string; initial: string; badge: string }
> = {
  Amazon: {
    bg: "rgba(255, 153, 0, 0.12)",
    color: "#d97706",
    border: "#fde68a",
    initial: "a",
    badge: "Amazon India",
  },
  Flipkart: {
    bg: "rgba(40, 116, 240, 0.12)",
    color: "#2563eb",
    border: "#bfdbfe",
    initial: "f",
    badge: "Flipkart",
  },
  Croma: {
    bg: "rgba(0, 168, 150, 0.12)",
    color: "#0d9488",
    border: "#99f6e4",
    initial: "c",
    badge: "Croma Retail",
  },
  "Reliance Digital": {
    bg: "rgba(225, 29, 72, 0.12)",
    color: "#e11d48",
    border: "#fecdd3",
    initial: "R",
    badge: "Reliance Digital",
  },
  "Vijay Sales": {
    bg: "rgba(124, 58, 237, 0.12)",
    color: "#7c3aed",
    border: "#ddd6fe",
    initial: "V",
    badge: "Vijay Sales",
  },
};

function ProductImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="product-summary-icon">
      {url?.startsWith("https://") && !failed ? (
        <img
          src={url}
          alt={name}
          width={80}
          height={80}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Fingerprint size={36} />
      )}
    </div>
  );
}

function RetailerOffer({
  offer,
  best,
  maxPrice,
}: {
  offer: Offer;
  best: boolean;
  maxPrice: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const verified = offer.status === "verified";
  const style = retailerStyles[offer.retailer] || {
    bg: "#f1f5f9",
    color: "#475569",
    border: "#cbd5e1",
    initial: offer.retailer[0],
    badge: offer.retailer,
  };

  const savings =
    best && maxPrice > Number(offer.total || 0)
      ? Math.round(maxPrice - Number(offer.total || 0))
      : 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`offer-card ${best ? "offer-card-best" : ""}`}
    >
      <div className="offer-main-row">
        {/* Retailer Brand Badge */}
        <div className="retailer-col">
          <div
            className="retailer-pill-icon"
            style={{
              backgroundColor: style.bg,
              color: style.color,
              borderColor: style.border,
            }}
          >
            {style.initial}
          </div>
          <div className="retailer-info">
            <div className="retailer-name-row">
              <strong className="retailer-name">{offer.retailer}</strong>
              {best && (
                <span className="best-price-pill">
                  <Sparkles size={11} /> LOWEST PRICE
                </span>
              )}
            </div>
            <span className="retailer-subtext">
              {best
                ? "Fastest delivery & guaranteed lowest deal"
                : verified
                ? "Live verified in-stock listing"
                : "Awaiting store update"}
            </span>
          </div>
        </div>

        {/* Pricing info */}
        <div className="price-col">
          <div className="price-amount-wrap">
            <span className="price-currency">₹</span>
            <span className="price-amount">
              {offer.total
                ? Number(offer.total).toLocaleString("en-IN")
                : "—"}
            </span>
          </div>
          <div className="price-subtext">
            {verified ? (
              <span className="free-delivery-badge">
                <Check size={12} /> Free Delivery
              </span>
            ) : (
              <span>Not verified</span>
            )}
            {savings > 0 && (
              <span className="savings-pill">Save {money(savings)}</span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="action-col">
          {offer.url ? (
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`store-action-btn ${best ? "btn-best" : "btn-secondary"}`}
            >
              <span>{best ? "Buy Now" : "View Deal"}</span>
              <ExternalLink size={14} />
            </a>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="details-toggle-btn"
            >
              <span>Details</span>
              <ChevronDown
                size={16}
                className={expanded ? "chevron-open" : ""}
              />
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="expand-arrow-btn"
            title="Toggle pricing breakdown"
          >
            <ChevronDown
              size={17}
              className={expanded ? "chevron-open" : ""}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="offer-accordion-panel"
          >
            <div className="panel-inner">
              <p className="panel-reason">
                <Info size={14} />
                {offer.reason || "Live verified retailer price."}
              </p>
              <div className="cost-breakdown-grid">
                <div>
                  <dt>Base Price</dt>
                  <dd>{money(offer.price)}</dd>
                </div>
                <div>
                  <dt>Delivery Fee</dt>
                  <dd>{money(offer.shipping || "0")}</dd>
                </div>
                <div>
                  <dt>Mandatory Fees</dt>
                  <dd>{money(offer.mandatory_fees || "0")}</dd>
                </div>
                <div>
                  <dt>Total Payable</dt>
                  <dd>
                    <strong>{money(offer.total)}</strong>
                  </dd>
                </div>
              </div>
              {offer.url && (
                <div className="store-link-row">
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="direct-store-link"
                  >
                    Open {offer.retailer} product page{" "}
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ComparisonResults({
  result,
  loading,
  onReset,
}: {
  result: Comparison | null;
  loading: boolean;
  onReset: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("price");

  const offers =
    result?.offers
      .filter((o) => filter === "all" || o.status === "verified")
      .toSorted((a, b) => {
        if (sort === "name") return a.retailer.localeCompare(b.retailer);
        return (
          (a.total === null ? Infinity : Number(a.total)) -
          (b.total === null ? Infinity : Number(b.total))
        );
      }) || [];

  const maxPrice = Math.max(
    ...offers.map((o) => (o.total ? Number(o.total) : 0)),
    0
  );

  return (
    <section
      className="results-section section-wrap"
      id="comparison"
      aria-labelledby="results-title"
      aria-busy={loading}
    >
      <div className="results-heading">
        <div>
          <span className="eyebrow">
            <span className="tiny-line" /> LIVE COMPARISON
          </span>
          <h2 id="results-title">Real-Time Prices & Deals</h2>
        </div>
        <button className="text-button" onClick={onReset}>
          Compare another product <ArrowRight size={16} />
        </button>
      </div>

      {loading ? (
        <div className="loading-panel" role="status">
          <div className="loading-symbol">
            <SearchCheck size={32} />
            <span />
          </div>
          <h3>Searching Real-Time Prices</h3>
          <p>
            Fetching live offers and price history across Amazon, Flipkart, Croma,
            and more.
          </p>
          <div className="loading-steps">
            <span>
              <Check size={14} /> Product URL analyzed
            </span>
            <span>
              <LoaderCircle className="spin" size={14} /> Extracting live prices
            </span>
            <span className="muted">Compiling 90-day history</span>
          </div>
        </div>
      ) : (
        result && (
          <>
            {/* Top Product Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="product-hero-card"
            >
              <ProductImage
                key={result.product?.image_url}
                url={result.product?.image_url}
                name={result.product?.name || "Product"}
              />
              <div className="product-hero-info">
                <div className="product-topline">
                  <span className="source-retailer-badge">
                    {result.source_retailer} Link
                  </span>
                  <span className="verified-status-tag">
                    <ShieldCheck size={13} /> Real-Time Comparison
                  </span>
                </div>
                <h3>{result.product?.name || "Verified Product"}</h3>
                <p className="product-subtext">
                  {result.product
                    ? [
                        result.product.brand,
                        result.product.model,
                        ...Object.values(result.product.variant).filter(Boolean),
                      ].join(" · ")
                    : "Live verified product details"}
                </p>
                {result.product && (
                  <div className="product-specs-list">
                    {Object.entries(result.product.specifications)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <span key={key} className="spec-item">
                          {key}: <strong>{value}</strong>
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div className="best-deal-summary-box">
                <span className="best-deal-label">Best Price Found</span>
                <span className="best-deal-price">
                  {money(
                    result.offers.find((o) => o.id === result.best_offer_id)?.total
                  )}
                </span>
                <span className="best-deal-store">
                  at{" "}
                  {
                    result.offers.find((o) => o.id === result.best_offer_id)
                      ?.retailer
                  }
                </span>
              </div>
            </motion.div>

            {/* Price History Chart */}
            {result.price_history && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <PriceHistoryChart history={result.price_history} />
              </motion.div>
            )}

            {/* Comparison Toolbar */}
            <div className="comparison-toolbar">
              <div className="segmented">
                <button
                  onClick={() => setFilter("all")}
                  aria-pressed={filter === "all"}
                >
                  All Stores <span>{result.offers.length}</span>
                </button>
                <button
                  onClick={() => setFilter("verified")}
                  aria-pressed={filter === "verified"}
                >
                  In Stock <span>{result.coverage.verified}</span>
                </button>
              </div>
              <label className="sort-label">
                <ArrowDownUp size={14} />
                <span className="sr-only">Sort offers</span>
                <select
                  aria-label="Sort offers"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="price">Lowest Price First</option>
                  <option value="name">Store Name (A–Z)</option>
                </select>
              </label>
            </div>

            {/* Retailer Deals List */}
            <div className="offers-stack">
              {offers.map((offer) => (
                <RetailerOffer
                  key={offer.id}
                  offer={offer}
                  best={result.best_offer_id === offer.id}
                  maxPrice={maxPrice}
                />
              ))}
            </div>

            <div className="results-footnote">
              <ShieldCheck size={15} />
              <span>
                Prices and deals are compared across Amazon India, Flipkart,
                Croma, Reliance Digital, and Vijay Sales in real-time.
              </span>
            </div>
          </>
        )
      )}
    </section>
  );
}
