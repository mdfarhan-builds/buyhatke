"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, ArrowRight, Check, ChevronDown, Clock3, ExternalLink, Fingerprint, Info, LoaderCircle, SearchCheck, ShieldCheck, X } from "lucide-react";
import type { Comparison, Offer } from "@/lib/types";

const money = (value: string | null) => value === null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
const statusLabel: Record<string, string> = { verified: "Verified match", unavailable: "Unavailable", stale: "Outdated price", mismatch: "Different variant", out_of_stock: "Out of stock", incomplete: "Verification incomplete" };
const initials: Record<string, string> = { Amazon: "a", Flipkart: "f", Croma: "c", "Reliance Digital": "R", "Vijay Sales": "V" };

function ProductImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="product-summary-icon">{url?.startsWith("https://") && !failed ? <img src={url} alt={name} width={65} height={65} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <Fingerprint size={30} />}</div>;
}

function RetailerOffer({ offer, best }: { offer: Offer; best: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const verified = offer.status === "verified";
  return <motion.div layout className={`offer ${best ? "offer-best" : ""}`}>
    <button className="offer-summary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={`offer-${offer.id}`}>
      <span className={`retailer-avatar ${offer.retailer.toLowerCase().split(" ")[0]}`}>{initials[offer.retailer] || offer.retailer[0]}</span>
      <span className="offer-retailer"><strong>{offer.retailer}</strong><span>{best ? `Lowest verified total${offer.cached ? " · Cached source" : ""}` : offer.cached ? "Cached source" : verified ? "Authorized source" : "Price verification required"}</span></span>
      <span className="offer-price"><strong>{verified ? money(offer.total) : "—"}</strong><span>{verified ? "Total incl. known charges" : "No verified total"}</span></span>
      <span className={`offer-status ${verified ? "is-verified" : ""}`}>{verified ? <ShieldCheck size={13} /> : <Clock3 size={13} />}<span>{statusLabel[offer.status] || offer.status}</span></span>
      <ChevronDown size={17} className={expanded ? "expanded-chevron" : ""} />
    </button>
    <AnimatePresence initial={false}>{expanded && <motion.div id={`offer-${offer.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="offer-details-wrap">
      <div className="offer-details">
        <p><Info size={15} />{offer.reason || "Price currently unavailable — verification required."}</p>
        <dl><div><dt>Product price</dt><dd>{money(offer.price)}</dd></div><div><dt>Delivery</dt><dd>{money(offer.shipping)}</dd></div><div><dt>Mandatory charges</dt><dd>{money(offer.mandatory_fees)}</dd></div><div><dt>Availability</dt><dd>{offer.availability.replaceAll("_", " ")}</dd></div></dl>
        <div className="offer-provenance"><span>Last checked: {offer.last_checked ? new Date(offer.last_checked).toLocaleString() : "Not verified"}</span><span>Identity confidence: {offer.match_confidence > 0 ? `${Math.round(offer.match_confidence)}%` : "Not established"}</span></div>
        {offer.conditional_discounts.length > 0 && <div className="conditional"><strong>Conditional offers · excluded from ranking</strong>{offer.conditional_discounts.map((discount, index) => <p key={index}>{discount.label}{discount.amount ? ` · ${money(discount.amount)}` : ""} — {discount.conditions}</p>)}</div>}
        {offer.url && <a className="store-link" href={offer.url} target="_blank" rel="noopener noreferrer">Visit store <ExternalLink size={13} /></a>}
      </div>
    </motion.div>}</AnimatePresence>
  </motion.div>;
}

export default function ComparisonResults({ result, loading, onReset }: { result: Comparison | null; loading: boolean; onReset: () => void }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("price");
  const offers = result?.offers.filter(o => filter === "all" || o.status === "verified").toSorted((a, b) => sort === "name" ? a.retailer.localeCompare(b.retailer) : (a.status === "verified" ? 0 : 1) - (b.status === "verified" ? 0 : 1) || (a.total === null ? Infinity : Number(a.total)) - (b.total === null ? Infinity : Number(b.total))) || [];
  return <section className="results-section section-wrap" id="comparison" aria-labelledby="results-title" aria-busy={loading}>
    <div className="results-heading"><div><span className="eyebrow"><span className="tiny-line" />YOUR COMPARISON</span><h2 id="results-title">Clarity, down to the last detail.</h2></div><button className="text-button" onClick={onReset}>Compare another product <ArrowRight size={16} /></button></div>
    {loading ? <div className="loading-panel" role="status"><div className="loading-symbol"><SearchCheck size={30} /><span /></div><h3>Checking your product link</h3><p>Looking for authorized product data and matching offers.</p><div className="loading-steps"><span><Check size={14} />Link submitted</span><span><LoaderCircle className="spin" size={14} /> Checking price sources</span><span className="muted">Exact variant verification</span></div><span className="fineprint">Only verified information will appear in your results.</span></div> : result && <>
      <div className={`result-notice ${result.status === "complete" ? "notice-success" : ""}`} role="status"><div className="notice-icon">{result.status === "complete" ? <ShieldCheck size={21} /> : <Info size={21} />}</div><div><strong>{result.status === "complete" ? `${result.coverage.verified} verified ${result.coverage.verified === 1 ? "offer" : "offers"} found` : "No verified offers available yet"}</strong><p>{result.message}</p></div><span className="source-chip">{result.data_mode === "unconfigured" ? "Source connection needed" : "Authorized feed"}</span></div>
      <div className="completed-checks" aria-label="Verification results">{result.steps.map(step => <span key={step.id} className={step.status === "complete" ? "check-complete" : "check-unavailable"}>{step.status === "complete" ? <Check size={12} /> : <Info size={12} />}{step.label}</span>)}</div>
      <div className="product-summary"><ProductImage key={result.product?.image_url} url={result.product?.image_url} name={result.product?.name || "Product"} /><div><span className="eyebrow">{result.source_retailer} LINK</span><h3>{result.product?.name || "Product identity needs verification"}</h3><p>{result.product ? [result.product.brand, result.product.model, ...Object.values(result.product.variant).filter(Boolean)].join(" · ") : "A product link alone doesn’t establish an exact model, variant, or price."}</p>{result.product && <div className="product-specs">{Object.entries(result.product.specifications).slice(0, 5).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div>}</div><span className="coverage-count"><strong>{result.coverage.verified}/{result.coverage.supported}</strong> verified retailers</span></div>
      <div className="comparison-toolbar"><div className="segmented"><button onClick={() => setFilter("all")} aria-pressed={filter === "all"}>All retailers <span>{result.offers.length}</span></button><button onClick={() => setFilter("verified")} aria-pressed={filter === "verified"}>Verified only <span>{result.coverage.verified}</span></button></div><label className="sort-label"><ArrowDownUp size={13} /><span className="sr-only">Sort offers</span><select aria-label="Sort offers" value={sort} onChange={e => setSort(e.target.value)}><option value="price">Lowest total first</option><option value="name">Retailer A–Z</option></select></label></div>
      <div className="offer-table"><div className="table-caption"><span>RETAILER</span><span>VERIFIED TOTAL</span><span>MATCH STATUS</span></div>{offers.length ? offers.map(offer => <RetailerOffer key={offer.id} offer={offer} best={result.best_offer_id === offer.id} />) : <div className="empty-offers"><SearchCheck size={27} /><strong>No verified matches to show</strong><p>We’ll only rank an offer when its identity, price, availability, and total are verified.</p><button className="text-button" onClick={() => setFilter("all")}>Show all retailers <ArrowRight size={14} /></button></div>}</div>
      <div className="results-footnote"><ShieldCheck size={14} /><span>Prices are ranked only among the verified retailers checked. Conditional discounts are never included in the headline total.</span></div>
    </>}
  </section>;
}
